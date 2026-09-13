import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useCreateOffer } from "./offers";
import { validateSalary } from "./offers";
import { client } from "../../lib/api/client";
import { useQuery } from "@tanstack/react-query";

interface Props { open: boolean; onClose: () => void }

export function OfferBuilderDialog({ open, onClose }: Props) {
  const [form, setForm] = useState({
    applicationId: "",
    joiningDate: "",
    workLocation: "",
    probationPeriodDays: 90,
    noticePeriodDays: 60,
    validUntil: "",
    mode: "auto" as "auto" | "manual",
  });
  const [ctc, setCtc] = useState(1200000);
  const [manual, setManual] = useState({ basicSalary: 0, hra: 0, specialAllowance: 0, variablePay: 0, employerPF: 0 });
  const create = useCreateOffer();

  const { data: apps = [] } = useQuery({
    queryKey: ["applications", "offerBuilder"],
    queryFn: async () => (await client.get("/applications")).data.data?.applications ?? [],
    enabled: open,
  });

  const salary = useMemo(() => {
    if (form.mode === "auto") {
      const basic = Math.round(ctc * 0.4);
      const hra = Math.round(ctc * 0.2);
      const pf = Math.min(180000, Math.round(ctc * 0.06));
      const special = ctc - basic - hra - pf; // remainder keeps the sum exactly at CTC
      return { annualCTC: ctc, basicSalary: basic, hra, specialAllowance: special, employerPF: pf, variablePay: 0 };
    }
    return { annualCTC: ctc, ...manual };
  }, [form.mode, ctc, manual]);

  const validation = validateSalary(salary);

  const selectedApp = apps.find((a: any) => a._id === form.applicationId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[620px] max-h-[85vh] overflow-y-auto rounded-[20px]">
        <DialogHeader><DialogTitle className="text-ink">New offer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Application</Label>
            <select className="w-full mt-1 px-3 py-2 bg-slate border-transparent rounded-xl text-sm" value={form.applicationId} onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}>
              <option value="">Select application…</option>
              {apps.map((a: any) => <option key={a._id} value={a._id}>{a.candidateId?.fullName} — {a.jobId?.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Joining date</Label>
              <Input type="date" className="mt-1 bg-slate" value={form.joiningDate} onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Offer valid until</Label>
              <Input type="date" className="mt-1 bg-slate" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Work location</Label>
              <Input className="mt-1 bg-slate" placeholder="Pune HQ" value={form.workLocation} onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Probation (days)</Label>
              <Input type="number" className="mt-1 bg-slate" value={form.probationPeriodDays} onChange={(e) => setForm((f) => ({ ...f, probationPeriodDays: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Notice (days)</Label>
              <Input type="number" className="mt-1 bg-slate" value={form.noticePeriodDays} onChange={(e) => setForm((f) => ({ ...f, noticePeriodDays: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Annual CTC (₹)</Label>
              <Input type="number" className="bg-slate max-w-[200px]" value={ctc} onChange={(e) => setCtc(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
              {(["auto", "manual"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setForm((f) => ({ ...f, mode: m }))}
                  className={`px-3 py-1.5 rounded-pill text-xs font-medium border ${form.mode === m ? "bg-primary text-ink border-primary" : "bg-white border-border text-[#6B7280]"}`}>
                  {m === "auto" ? "CTC auto-split" : "Manual components"}
                </button>
              ))}
            </div>

            {form.mode === "auto" ? (
              <div className="grid grid-cols-2 gap-2 text-sm bg-slate/50 rounded-xl p-3">
                <p>Basic (40%)</p><p className="text-right font-medium">₹{salary.basicSalary?.toLocaleString("en-IN")}</p>
                <p>HRA (20%)</p><p className="text-right font-medium">₹{salary.hra?.toLocaleString("en-IN")}</p>
                <p>Special allowance</p><p className="text-right font-medium">₹{salary.specialAllowance?.toLocaleString("en-IN")}</p>
                <p>Employer PF</p><p className="text-right font-medium">₹{salary.employerPF?.toLocaleString("en-IN")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(manual) as (keyof typeof manual)[]).map((k) => (
                  <div key={k}>
                    <Label className="text-[11px] capitalize">{k.replace(/([A-Z])/g, " $1")}</Label>
                    <Input type="number" className="mt-1 bg-slate" value={manual[k]} onChange={(e) => setManual((m) => ({ ...m, [k]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
            )}

            <p className={`text-xs font-medium ${validation.valid ? "text-green-600" : "text-red-600"}`}>
              {validation.valid
                ? `Components sum to CTC exactly. Monthly gross ₹${validation.monthlyGross.toLocaleString("en-IN")}.`
                : `Mismatch: components are ₹${validation.mismatch.toLocaleString("en-IN")} off the CTC — the backend rejects anything beyond ±1.`}
            </p>
          </div>

          <Button className="w-full bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill"
            disabled={!form.applicationId || !form.joiningDate || !form.validUntil || !form.workLocation || !validation.valid || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  applicationId: form.applicationId,
                  jobId: selectedApp?.jobId?._id ?? selectedApp?.jobId,
                  candidateId: selectedApp?.candidateId?._id ?? selectedApp?.candidateId,
                  joiningDate: new Date(form.joiningDate).toISOString(),
                  validUntil: new Date(form.validUntil).toISOString(),
                  workLocation: form.workLocation,
                  probationPeriodDays: form.probationPeriodDays,
                  noticePeriodDays: form.noticePeriodDays,
                  salaryStructure: salary,
                },
                { onSuccess: onClose }
              )
            }
          >
            {create.isPending ? "Creating…" : "Create draft offer"}
          </Button>
          {create.isError && <p className="text-xs text-red-600">{(create.error as any)?.response?.data?.error?.message ?? "Create failed"}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
