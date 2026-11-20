import type { PumpChart, PumpSpecification } from "@/cms/public-pump-selection";
import { getPumpTechnicalData } from "@/lib/pump-technical-data";
import type { FlowUnit } from "@/lib/flow-units";
import css from "./pump-selection.module.css";

export default function PumpTechnicalData({ chart, specification, flowUnit = 'm3h' }: { chart: PumpChart; specification: PumpSpecification; flowUnit?: FlowUnit }) {
  const { description, sections } = getPumpTechnicalData(chart, specification, flowUnit);

  return (
    <div className={css.specification}>
      {description && <p className={css.specificationDescription}>{description}</p>}
      <table aria-label={`Технические данные ${chart.name}`}>
        {sections.map(({ title, rows }) => (
          <tbody key={title}>
            <tr><th scope="rowgroup" colSpan={2}>{title}</th></tr>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
