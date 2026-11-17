"use client";

import model from "@/data/models/demand-forecasting.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, spread } from "../neuron";

const WEATHER = ["Clear", "Mist / cloudy", "Light rain / snow"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day0 = Date.UTC(2011, 0, 1); // t = days since the first day of the data
const picked = spread(model.samples, (s) => s.actual);
export const rows = picked.map((s) => ({
  id: s.id,
  input: {
    t: Math.round((Date.parse(`${s.id}T00:00:00Z`) - day0) / 86400000),
    holiday: s.holiday,
    workingday: s.workingday,
    temp_c: s.temp_c,
    temp_c2: s.temp_c * s.temp_c,
    hum_p: s.hum_p,
    wind: s.wind,
    mnth: String(s.mnth),
    weekday: String(s.weekday),
    weathersit: String(s.weathersit),
  },
  actual: `${s.actual.toLocaleString("en-US")} rides`,
  value: s.actual,
}));
const shows = picked.map((s) => ({
  Temperature: `${s.temp_c} °C`,
  weekday: DAYS[s.weekday],
  mnth: MONTHS[s.mnth - 1],
  weathersit: WEATHER[s.weathersit - 1],
  holiday: s.holiday ? "Yes" : "No",
  workingday: s.workingday ? "Yes" : "No",
}));

const labels = {
  t: "Day number (growth trend)",
  hum_p: "Humidity (%)",
  wind: "Wind (km/h)",
  mnth: "Month",
  weekday: "Day of week",
  weathersit: "Weather",
  workingday: "Working day",
};

export function Inside() {
  return (
    <NeuronExplainer
      title="One day, one neuron."
      line="Ridge regression is a single neuron without the squashing step: calendar, weather and a growth trend, each times a weight, add up to the day's rentals. Temperature and temperature² enter as one input."
      model={model.model as LogRegModel}
      rows={rows}
      entity="day"
      out={{
        kind: "value",
        name: "the number of rentals",
        unit: "bike rentals",
        digits: 0,
      }}
      trained={`${model.dataset.rows} days`}
      labels={labels}
      groups={{ Temperature: ["temp_c", "temp_c2"] }}
      shows={shows}
    />
  );
}
