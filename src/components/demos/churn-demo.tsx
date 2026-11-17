"use client";

import { useMemo, useState } from "react";
import model from "@/data/models/telco-churn.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, RiskMeter, Segmented, Slider } from "./controls";

const labels: Record<string, string> = {
  tenure: "Months as customer",
  MonthlyCharges: "Monthly bill",
  Contract: "Contract",
  InternetService: "Internet",
  PaymentMethod: "Payment",
  TechSupport: "Tech support",
  OnlineSecurity: "Online security",
  PaperlessBilling: "Paperless billing",
  SeniorCitizen: "Senior citizen",
};

export type TelcoSample = (typeof model.samples)[number];

const yn = (v: string): "No" | "Yes" => (v === "Yes" ? "Yes" : "No");

/** Remount with a new `key` to load a different preset row. */
export function ChurnDemo({ preset }: { preset?: TelcoSample | null }) {
  const [tenure, setTenure] = useState(preset?.tenure ?? 4);
  const [bill, setBill] = useState(preset ? Math.round(preset.MonthlyCharges) : 85);
  const [contract, setContract] = useState(preset?.Contract ?? "Month-to-month");
  const [internet, setInternet] = useState(preset?.InternetService ?? "Fiber optic");
  const [payment, setPayment] = useState(preset?.PaymentMethod ?? "Electronic check");
  const [support, setSupport] = useState<"No" | "Yes">(preset ? yn(preset.TechSupport) : "No");
  const [security, setSecurity] = useState<"No" | "Yes">(preset ? yn(preset.OnlineSecurity) : "No");
  const [paperless, setPaperless] = useState<"No" | "Yes">(preset ? yn(preset.PaperlessBilling) : "Yes");
  const [senior, setSenior] = useState<"No" | "Yes">(preset ? yn(preset.SeniorCitizen) : "No");

  // Without internet, the add-on services don't exist.
  const addon = (v: "No" | "Yes") => (internet === "No" ? "No internet service" : v);

  const result = useMemo(
    () =>
      predict(model.model as LogRegModel, {
        tenure,
        MonthlyCharges: bill,
        Contract: contract,
        InternetService: internet,
        PaymentMethod: payment,
        TechSupport: addon(support),
        OnlineSecurity: addon(security),
        PaperlessBilling: paperless,
        SeniorCitizen: senior,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenure, bill, contract, internet, payment, support, security, paperless, senior],
  );

  const [lo, hi] = model.ranges.MonthlyCharges;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Build a customer</p>
        <Slider label="Months as customer" value={tenure} min={0} max={72} onChange={setTenure} />
        <Slider label="Monthly bill" value={bill} min={Math.floor(lo)} max={Math.ceil(hi)} unit=" $" onChange={setBill} />
        <Segmented label="Contract" value={contract} options={model.options.Contract} onChange={setContract} />
        <Segmented label="Internet" value={internet} options={model.options.InternetService} onChange={setInternet} />
        <Segmented label="Payment" value={payment} options={model.options.PaymentMethod} onChange={setPayment} />
        <div className="grid grid-cols-2 gap-4">
          <Segmented label="Tech support" value={support} options={["No", "Yes"]} onChange={setSupport} />
          <Segmented label="Online security" value={security} options={["No", "Yes"]} onChange={setSecurity} />
          <Segmented label="Paperless billing" value={paperless} options={["No", "Yes"]} onChange={setPaperless} />
          <Segmented label="Senior citizen" value={senior} options={["No", "Yes"]} onChange={setSenior} />
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
        <RiskMeter probability={result.probability} label="Chance this customer churns" />
        {preset && (
          <p className="-mt-2 rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded customer <b className="font-mono">{preset.id}</b> from the test set. What really happened:{" "}
            <b>{preset.actual === "Yes" ? "churned" : "stayed"}</b>. Change any input to see how the risk moves.
          </p>
        )}
        <Drivers items={result.contributions} labels={labels} />
        <p className="mt-auto text-[12px] text-muted">
          Logistic regression trained on {model.dataset.rows.toLocaleString("en-US")} customers · test ROC-AUC {model.metrics.roc_auc.toFixed(3)}
        </p>
      </div>
    </div>
  );
}
