import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { client } from "../../lib/api/client";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { CheckCircle2, XCircle, Building2 } from "lucide-react";

type PortalOffer = {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  companyLogoUrl?: string;
  companyAddress?: string;
  joiningDate: string | null;
  salarySummary: { annualCTC: number | null; currency: string };
  workLocation: string;
  pdfUrl: string;
  expiresAt: string | null;
  status: string;
};

const inr = (n: number | null) => (n == null ? "—" : "₹" + n.toLocaleString("en-IN"));

export const PortalOfferPage = () => {
  const { token } = useParams();

  const { data: offer, error, isLoading } = useQuery<PortalOffer>({
    queryKey: ["portal-offer", token],
    queryFn: async () => (await client.get(`/portal/offers/${token}`)).data.data.offer,
    retry: false,
  });

  const decided = offer?.status === "accepted" || offer?.status === "rejected";
  const [action, setAction] = useState<"none" | "accept" | "reject" | "query">("none");
  const [fullName, setFullName] = useState("");
  const [reason, setReason] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = () => client.get(`/portal/offers/${token}`).then((r) => r.data.data.offer).catch(() => null);

  const accept = useMutation({
    mutationFn: async () => (await client.post(`/portal/offers/${token}/accept`, { fullName })).data.data,
    onSuccess: async (d) => {
      setResult({ kind: "ok", text: `Offer accepted as "${d.signedAs}" at ${new Date(d.acceptedAt).toLocaleString()} (IP ${d.ip} recorded).` });
      setAction("none");
      await refresh();
    },
    onError: (e: any) => setResult({ kind: "err", text: e.response?.data?.error?.message || "Could not accept the offer." }),
  });
  const reject = useMutation({
    mutationFn: async () => (await client.post(`/portal/offers/${token}/reject`, { reason })).data.data,
    onSuccess: async () => { setResult({ kind: "ok", text: "You have declined this offer. The hiring team has been notified." }); setAction("none"); await refresh(); },
    onError: (e: any) => setResult({ kind: "err", text: e.response?.data?.error?.message || "Could not decline the offer." }),
  });
  const query = useMutation({
    mutationFn: async () => (await client.post(`/portal/offers/${token}/query`, { message: question })).data.data,
    onSuccess: () => { setResult({ kind: "ok", text: "Your question has been sent to the hiring team." }); setAction("none"); setQuestion(""); },
    onError: (e: any) => setResult({ kind: "err", text: e.response?.data?.error?.message || "Could not send your question." }),
  });

  if (isLoading) return <Center><p className="text-[#6B7280]">Loading your offer…</p></Center>;
  if (error || !offer) return <Center><InvalidState /></Center>;

  const expired = offer.status === "expired" || (offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now());

  return (
    <div className="min-h-screen bg-slate flex items-start justify-center p-4 md:p-10">
      <div className="w-full max-w-xl space-y-4">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 md:p-8">
          <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-4 mb-4">
            <div className="h-11 w-11 rounded-xl bg-primary-tint flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-ink">{offer.companyName || "Hiring Team"}</p>
              <p className="text-xs text-[#6B7280]">Official offer letter</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-ink">Congratulations, {offer.candidateName}!</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            We're pleased to offer you the position of <strong className="text-ink">{offer.jobTitle}</strong>.
          </p>

          <dl className="grid grid-cols-2 gap-3 mt-5 text-sm">
            <Fact label="Annual compensation" value={inr(offer.salarySummary?.annualCTC)} />
            <Fact label="Joining date" value={offer.joiningDate ? new Date(offer.joiningDate).toDateString() : "To be discussed"} />
            <Fact label="Work location" value={offer.workLocation || "—"} />
            <Fact label="Respond by" value={offer.expiresAt ? new Date(offer.expiresAt).toDateString() : "—"} />
          </dl>

          {offer.pdfUrl && (
            <a
              href={offer.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-5 text-sm font-semibold text-primary hover:underline"
            >
              📄 Download the full offer letter (PDF)
            </a>
          )}

          {result && (
            <div className={`mt-5 p-4 rounded-xl text-sm font-medium ${result.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {result.text}
            </div>
          )}

          {offer.status === "accepted" && <AcceptedBanner />}
          {offer.status === "rejected" && <RejectedBanner />}
          {!decided && !expired && (
            <div className="mt-6 space-y-3">
              {action === "none" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => setAction("accept")} className="flex-1 bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill">
                    Accept offer
                  </Button>
                  <Button onClick={() => setAction("reject")} variant="outline" className="flex-1 rounded-pill bg-white text-ink border-border hover:bg-slate">
                    Decline
                  </Button>
                  <Button onClick={() => setAction("query")} variant="outline" className="rounded-pill bg-white text-ink border-border hover:bg-slate">
                    Ask a question
                  </Button>
                </div>
              )}
              {action === "accept" && (
                <div className="space-y-3 p-4 border border-[#E5E7EB] rounded-xl">
                  <Label className="text-xs">Type your full legal name as your electronic signature</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rohan Deshpande" />
                  <p className="text-[11px] text-[#6B7280]">Your typed name, the timestamp, and your IP address are recorded as acceptance of this offer.</p>
                  <div className="flex gap-2">
                    <Button disabled={accept.isPending || fullName.trim().length < 3} onClick={() => accept.mutate()} className="bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill">
                      {accept.isPending ? "Signing…" : "Sign & accept"}
                    </Button>
                    <Button variant="outline" className="rounded-pill bg-white" onClick={() => setAction("none")}>Cancel</Button>
                  </div>
                </div>
              )}
              {action === "reject" && (
                <div className="space-y-3 p-4 border border-[#E5E7EB] rounded-xl">
                  <Label className="text-xs">Reason (optional)</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell us why (optional)" />
                  <div className="flex gap-2">
                    <Button disabled={reject.isPending} onClick={() => reject.mutate()} className="bg-red-500 hover:bg-red-600 text-white rounded-pill">
                      {reject.isPending ? "Sending…" : "Confirm decline"}
                    </Button>
                    <Button variant="outline" className="rounded-pill bg-white" onClick={() => setAction("none")}>Cancel</Button>
                  </div>
                </div>
              )}
              {action === "query" && (
                <div className="space-y-3 p-4 border border-[#E5E7EB] rounded-xl">
                  <Label className="text-xs">Your question for the hiring team</Label>
                  <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Can the joining date be moved by two weeks?" />
                  <div className="flex gap-2">
                    <Button disabled={query.isPending || question.trim().length < 3} onClick={() => query.mutate()} className="bg-primary hover:bg-primary-bright text-white rounded-pill">
                      {query.isPending ? "Sending…" : "Send question"}
                    </Button>
                    <Button variant="outline" className="rounded-pill bg-white" onClick={() => setAction("none")}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {expired && !decided && (
            <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm font-medium">
              This offer has expired. Please contact the hiring team.
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-[#9CA3AF]">Powered by HireFlow AI · This link is personal to you</p>
      </div>
    </div>
  );
};

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate flex items-center justify-center">{children}</div>;
}

function InvalidState() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 max-w-md text-center">
      <XCircle className="h-10 w-10 text-red-400 mx-auto" />
      <h1 className="text-lg font-bold text-ink mt-3">Offer link unavailable</h1>
      <p className="text-sm text-[#6B7280] mt-1">This offer link is invalid or no longer available. Please check the link in your email or contact the hiring team.</p>
    </div>
  );
}

function AcceptedBanner() {
  return (
    <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4" /> You have accepted this offer. Welcome aboard!
    </div>
  );
}

function RejectedBanner() {
  return (
    <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
      <XCircle className="h-4 w-4" /> You declined this offer.
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate/70 rounded-xl px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-[#6B7280]">{label}</dt>
      <dd className="font-semibold text-ink mt-0.5">{value}</dd>
    </div>
  );
}
