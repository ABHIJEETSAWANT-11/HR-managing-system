import { useState } from "react";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Gift, Download, Plus } from "lucide-react";
import { useOffers, useApproval, useOfferAction, downloadOfferPdf, type Offer } from "./offers";
import { OfferBuilderDialog } from "./OfferBuilderDialog";
import { client } from "../../lib/api/client";
import { useAuth } from "../../auth/AuthProvider";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  awaiting_approval: "bg-yellow-100 text-yellow-800",
  changes_requested: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-indigo-100 text-indigo-800",
  accepted: "bg-green-600 text-white",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-300 text-gray-700",
};

function candidateName(o: Offer) {
  return typeof o.candidateId === "object" ? o.candidateId?.fullName ?? "—" : "—";
}

function ApprovalChain({ offerId }: { offerId: string }) {
  const { data: approval } = useApproval(offerId);
  if (!approval) return <p className="text-xs text-[#6B7280]">Approval chain loads after submission.</p>;
  return (
    <div className="space-y-2">
      {approval.approvalConfig?.map((c) => {
        const a = approval.approvals?.find((x) => x.level === c.level);
        const color = a?.status === "approved" ? "bg-green-100 text-green-800" : a?.status === "rejected" ? "bg-red-100 text-red-800" : a?.status === "changes_requested" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-600";
        return (
          <div key={c.level} className="flex items-center justify-between bg-slate/50 rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-ink">Level {c.level}: {c.approverRole.replace(/_/g, " ")}</span>
            <Badge className={`${color} border-0 rounded-pill`}>{a?.status ?? "pending"}</Badge>
          </div>
        );
      })}
    </div>
  );
}

function OfferDetail({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const action = useOfferAction();
  const [comments, setComments] = useState("");
  const [pdfError, setPdfError] = useState("");
  const { data: approval } = useApproval(offer._id);
  const { user } = useAuth();
  const role = user?.role;
  const canAct = approval?.approvals?.some((a) => a.level === approval.currentLevel && ["hiring_manager", "finance_approver", "hr_head"].includes(role ?? ""));

  const money = (n?: number) => (n === undefined ? "—" : "₹" + n.toLocaleString("en-IN"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge className={`${statusColors[offer.status] ?? "bg-gray-100"} border-0 rounded-pill`}>{offer.status.replace(/_/g, " ")}</Badge>
        <span className="text-[#6B7280]">v{offer.version} · valid until {new Date(offer.validUntil).toLocaleDateString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="text-[#6B7280]">Joining</p><p>{new Date(offer.joiningDate).toLocaleDateString()}</p>
        <p className="text-[#6B7280]">Location</p><p>{offer.workLocation}</p>
        <p className="text-[#6B7280]">Probation / Notice</p><p>{offer.probationPeriodDays ?? "—"} / {offer.noticePeriodDays ?? "—"} days</p>
        <p className="text-[#6B7280]">Annual CTC</p><p className="font-semibold">{money(offer.salaryStructure?.annualCTC)}</p>
        <p className="text-[#6B7280]">Monthly gross</p><p>{money(offer.salaryStructure?.monthlyGross)}</p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-2">Approval chain</p>
        <ApprovalChain offerId={offer._id} />
      </div>

      {canAct && offer.status === "awaiting_approval" && (
        <div className="border border-border rounded-2xl p-3 space-y-2">
          <Label className="text-xs">Comments (required to approve/reject/request changes)</Label>
          <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="e.g. Budget confirmed for this level" />
          <div className="flex gap-2">
            <Button size="sm" className="bg-[#95CC29] hover:bg-primary text-ink rounded-pill" disabled={!comments.trim() || action.isPending}
              onClick={() => action.mutate({ id: offer._id, action: "approve", decision: "approve", comments }, { onSuccess: onClose })}>Approve</Button>
            <Button size="sm" variant="outline" className="rounded-pill" disabled={!comments.trim() || action.isPending}
              onClick={() => action.mutate({ id: offer._id, action: "approve", decision: "request_changes", comments }, { onSuccess: onClose })}>Request changes</Button>
            <Button size="sm" variant="ghost" className="text-red-600 rounded-pill" disabled={!comments.trim() || action.isPending}
              onClick={() => action.mutate({ id: offer._id, action: "approve", decision: "reject", comments }, { onSuccess: onClose })}>Reject</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {offer.status === "draft" && (
          <Button size="sm" className="bg-[#95CC29] hover:bg-primary text-ink rounded-pill" disabled={action.isPending}
            onClick={() => action.mutate({ id: offer._id, action: "submit" }, { onSuccess: onClose })}>Submit for approval</Button>
        )}
        {offer.status === "approved" && (
          <Button size="sm" className="bg-[#95CC29] hover:bg-primary text-ink rounded-pill" disabled={action.isPending}
            onClick={() => action.mutate({ id: offer._id, action: "send" }, { onSuccess: onClose })}>Generate PDF & send</Button>
        )}
        <Button size="sm" variant="outline" className="rounded-pill gap-1"
          onClick={() => downloadOfferPdf(offer._id, candidateName(offer)).catch((e) => setPdfError(e?.response?.data?.error?.message ?? "Download failed"))}>
          <Download className="h-3.5 w-3.5" /> Download PDF
        </Button>
      </div>
      {pdfError && <p className="text-xs text-red-600">{pdfError}</p>}
    </div>
  );
}

export const OffersPage = () => {
  const { data: offers = [], isLoading } = useOffers();
  const [detail, setDetail] = useState<Offer | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <TopBar />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Offers</h2>
          <p className="text-sm text-[#6B7280]">Build, approve and send offer letters.</p>
        </div>
        <Button className="bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill flex items-center gap-2" onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4" /> New offer
        </Button>
      </div>

      <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate/50 text-[10px] uppercase tracking-widest text-[#6B7280] font-medium border-b border-border">
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Job</th>
                <th className="px-6 py-4">CTC</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#6B7280]">Loading offers…</td></tr>
              ) : offers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#6B7280]">No offers yet. Create one from an application.</td></tr>
              ) : (
                offers.map((o) => (
                  <tr key={o._id} className="hover:bg-slate/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-ink">{candidateName(o)}</td>
                    <td className="px-6 py-4 text-[#374151]">{typeof o.jobId === "object" ? o.jobId?.title ?? "—" : "—"}</td>
                    <td className="px-6 py-4 text-[#374151]">₹{(o.salaryStructure?.annualCTC ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4"><Badge className={`${statusColors[o.status] ?? "bg-gray-100 text-gray-700"} border-0 rounded-pill`}>{o.status.replace(/_/g, " ")}</Badge></td>
                    <td className="px-6 py-4 text-[#374151]">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary" onClick={() => setDetail(o)}>Open</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-[640px] max-h-[85vh] overflow-y-auto rounded-[20px]">
          <DialogHeader><DialogTitle className="text-ink">Offer — {candidateName(detail ?? ({} as Offer))}</DialogTitle></DialogHeader>
          {detail && <OfferDetail offer={detail} onClose={() => setDetail(null)} />}
        </DialogContent>
      </Dialog>

      <OfferBuilderDialog open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </div>
  );
};
