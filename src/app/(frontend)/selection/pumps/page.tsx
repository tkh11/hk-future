import { getCMSPageMetadata } from "@/content/cms-adapter";
import CMSPageOverride from "@/components/cms/CMSPageOverride";
import { cmsEnabled } from "@/cms/env";
import { selectPublicPumps } from "@/cms/public-pump-selection";
import { createSystemCurve } from "@/lib/pump-operating-point";
import { parseFlowUnit, toM3h } from "@/lib/flow-units";
import { readPumpDecimal } from "@/lib/pump-input";
import { isPumpSystemType, pumpSystemTypes } from "@/lib/pump-system-types";
import { defaultPumpFluid, parsePumpFluidInput, resolvePumpFluid } from "@/lib/pump-fluid";
import Form from "next/form";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import OperatingModeFields, { type OperatingMode } from "./OperatingModeFields";
import FlowRateField from "./FlowRateField";
import PumpFluidFields from "./PumpFluidFields";
import PumpSelectionResults from "./PumpSelectionResults";
import css from "./pump-selection.module.css";

const path = "/selection/pumps";
const selectionParams = ["flow", "flowUnit", "head", "staticHead", "system", "mode", "curve", "fluid", "temperature", "concentration", "fluidName", "density", "viscosity"];

const defaultMetadata: Metadata = {
  title: "Подбор насосного оборудования — HEISSKRAFT",
  description: "Подбор насосов HEISSKRAFT по расходу, напору и типу системы.",
};

export async function generateMetadata(): Promise<Metadata> {
  return getCMSPageMetadata(path, defaultMetadata);
}

type SearchParams = PageProps<"/selection/pumps">["searchParams"];

async function PumpSelection({ searchParams }: { searchParams: SearchParams }) {
  if (!cmsEnabled()) {
    return <div className={css.panel}>
      <p>Подбор насосов сейчас недоступен.</p>
      <Link className="page-stub__cta" href="/catalog/pumps">Насосы в каталоге</Link>
    </div>;
  }

  const query = await searchParams;
  if (selectionParams.some(key => query[key] !== undefined)) {
    const requestHeaders = await headers();
    const fetchMode = requestHeaders.get("sec-fetch-mode");
    // Next's form and chart links navigate without loading a new document.
    if (fetchMode === "navigate" || (!fetchMode && requestHeaders.get("accept")?.includes("text/html"))) {
      redirect(`${path}#`);
    }
  }
  const field = (key: string) => typeof query[key] === "string" ? query[key] : "";
  const rawFlow = field("flow");
  const rawHead = field("head");
  const rawSystem = field("system");
  const rawFluid = query.fluid === undefined ? defaultPumpFluid.kind : field("fluid").trim();
  const rawTemperature = query.temperature === undefined && rawFluid !== "custom" ? String(defaultPumpFluid.temperatureC) : field("temperature");
  const rawConcentration = field("concentration");
  const customFields = { fluidName: field("fluidName"), density: field("density"), viscosity: field("viscosity") };
  const mode: OperatingMode = field("mode") === "advanced" ? "advanced" : "quick";
  const submitted = mode === "quick" && ["flow", "head", "system"].some(key => query[key] !== undefined);
  const rawStaticHead = field("staticHead");
  const staticHeadM = rawStaticHead.trim() ? readPumpDecimal(rawStaticHead) : 0;
  const flowUnit = parseFlowUnit(field("flowUnit"));
  const enteredFlow = readPumpDecimal(rawFlow);
  const flowM3h = enteredFlow === null ? null : toM3h(enteredFlow, flowUnit);
  const requiredHeadM = readPumpDecimal(rawHead);
  const validFlow = flowM3h !== null && Number.isFinite(flowM3h) && flowM3h > 0;
  const validSystem = isPumpSystemType(rawSystem);
  const flowError = submitted && !validFlow;
  const headError = submitted && requiredHeadM === null;
  const systemError = submitted && !validSystem;
  const fluidInput = rawFluid && (rawFluid === "custom" || rawTemperature.trim())
    ? parsePumpFluidInput(rawFluid, rawTemperature, rawConcentration, customFields) : null;
  const fluid = fluidInput && resolvePumpFluid(fluidInput);
  const fluidError = submitted && !fluid;
  const staticError = !submitted ? undefined
    : staticHeadM === null ? "Введите статический напор числом от 0."
    : requiredHeadM !== null && staticHeadM > requiredHeadM ? "Статический напор не должен превышать расчётный." : undefined;
  const duty = mode === "quick" && validFlow && requiredHeadM !== null && validSystem ? { flowM3h, requiredHeadM, system: rawSystem } : null;
  const systemCurve = duty && staticHeadM !== null && !staticError
    ? createSystemCurve(duty, staticHeadM) : null;
  let results: Awaited<ReturnType<typeof selectPublicPumps>> | undefined;
  let serviceError = false;

  if (duty && systemCurve && fluid) {
    try {
      results = await selectPublicPumps(duty, { systemCurve, chartSku: field("curve"), fluid });
    } catch (error) {
      console.error("Pump selection failed", error);
      serviceError = true;
    }
  }

  const chartQuery = {
    flow: rawFlow.trim(), flowUnit, head: rawHead.trim(), staticHead: rawStaticHead.trim(), system: rawSystem, mode,
    fluid: rawFluid, temperature: rawTemperature.trim(),
    concentration: fluid?.concentrationPct == null ? undefined : rawConcentration.trim(),
    ...(fluid?.kind === "custom" ? customFields : {}),
  };

  return (
    <OperatingModeFields key={JSON.stringify([mode, rawFlow, flowUnit, rawHead, rawStaticHead, rawSystem, rawFluid, rawTemperature, rawConcentration, customFields])} initialMode={mode} quickForm={
      <Form id="pump-selection-form" action={`${path}#pump-results-title`} aria-label="Подбор насосов" autoComplete="off" noValidate>
        <div className={css.fields}>
          <FlowRateField id="pump-flow" defaultValue={rawFlow.slice(0, 64)} defaultUnit={flowUnit} error={flowError} />
          <div className={css.field}>
            <label htmlFor="pump-head">Расчётный напор, м</label>
            <input id="pump-head" name="head" inputMode="decimal" required defaultValue={rawHead.slice(0, 64)}
              maxLength={64} aria-invalid={headError || undefined}
              aria-describedby={headError ? "pump-head-error" : undefined} />
            {headError ? <p id="pump-head-error" className={css.error}>Введите напор числом от 0.</p> : null}
          </div>
          <div className={css.field}>
            <label htmlFor="pump-static-head">Статический напор, м</label>
            <input id="pump-static-head" name="staticHead" inputMode="decimal" maxLength={64}
              defaultValue={rawStaticHead.slice(0, 64)}
              aria-invalid={staticError ? true : undefined} aria-describedby={staticError ? "pump-static-error" : undefined} />
            {staticError ? <p id="pump-static-error" className={css.error}>{staticError}</p> : null}
          </div>
          <div className={css.field}>
            <label htmlFor="pump-system">Тип системы</label>
            <select id="pump-system" name="system" required defaultValue={validSystem ? rawSystem : ""}
              aria-invalid={systemError || undefined} aria-describedby={systemError ? "pump-system-error" : undefined}>
              <option value="" disabled>Выберите тип системы</option>
              {Object.entries(pumpSystemTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {systemError ? <p id="pump-system-error" className={css.error}>Выберите тип системы из списка.</p> : null}
          </div>
          <PumpFluidFields fluid={rawFluid} temperature={rawTemperature.slice(0, 64)}
            concentration={rawConcentration.slice(0, 64)} customFields={customFields} error={fluidError} />
          <button className={css.submit} type="submit">Подобрать насосы</button>
        </div>
      </Form>
    }>
      {serviceError ? <p className={css.message} role="alert">Не удалось выполнить подбор. Попробуйте ещё раз.</p> : null}
      {results && duty && systemCurve ? (
        <section className={css.results} aria-labelledby="pump-results-title">
          <h2 id="pump-results-title">Результаты подбора</h2>
          <PumpSelectionResults key={JSON.stringify([chartQuery, results.chart?.sku])}
            results={results} duty={duty} system={systemCurve} flowUnit={flowUnit} query={chartQuery} />
        </section>
      ) : null}
    </OperatingModeFields>
  );
}

export default function CMSAwarePage({ searchParams }: PageProps<"/selection/pumps">) {
  const tool = <PumpSelection searchParams={searchParams} />;
  return (
    <CMSPageOverride path={path} afterContent={<section className={css.embedded} aria-label="Программа подбора насосов">{tool}</section>}>
      <main data-header-theme="light">
        <section className="page-stub">
          <div className="page-stub__inner">
            <h1 className="page-stub__title">Подбор насосного оборудования</h1>
            {tool}
          </div>
        </section>
      </main>
    </CMSPageOverride>
  );
}
