"use client";

import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Tabs } from "radix-ui";
import type { PumpPdfData } from "@/lib/pump-pdf";
import PumpPdfButton from "./PumpPdfButton";
import PumpResultsTable from "./PumpResultsTable";
import css from "./pump-selection.module.css";

export default function PumpResultDetails({ chart, technicalData, table, sheet }: {
  chart: ReactNode;
  technicalData: ReactNode;
  table: Omit<ComponentProps<typeof PumpResultsTable>, "onShowChart">;
  sheet: PumpPdfData;
}) {
  const [tab, setTab] = useState("chart");
  const chartRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <Tabs.Root value={tab} onValueChange={setTab} className={css.resultTabs}>
        <div className={css.resultToolbar}>
          <Tabs.List aria-label="Информация о насосе" className={css.resultTabList}>
            <Tabs.Trigger value="chart">График</Tabs.Trigger>
            <Tabs.Trigger value="technical-data">Технические данные</Tabs.Trigger>
          </Tabs.List>
          <PumpPdfButton key={sheet.sku} data={sheet} chartRef={chartRef} />
        </div>
        <Tabs.Content ref={chartRef} value="chart" forceMount className={css.resultTabPanel}>{chart}</Tabs.Content>
        <Tabs.Content value="technical-data" className={css.resultTabPanel}>{technicalData}</Tabs.Content>
      </Tabs.Root>
      <PumpResultsTable {...table} onShowChart={() => setTab("chart")} />
    </>
  );
}
