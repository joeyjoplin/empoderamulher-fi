import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContrafactualCompare } from "./ContrafactualCompare";

describe("<ContrafactualCompare />", () => {
  it("renders three cards (cheque especial, empowerfi, rotativo) with computed interest values", () => {
    render(
      <ContrafactualCompare amount={380} termMonths={1} empowerFiRate={0.04} />,
    );

    expect(
      within(screen.getByTestId("plan-cheque")).getByText(/Cheque Especial/i),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("plan-empower")).getByText(/Crédito EmpowerFI/i),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("plan-rotativo")).getByText(/Cartão Rotativo/i),
    ).toBeInTheDocument();

    // EmpowerFI 4% on R$ 380 for 1 month → R$ 15,20
    expect(screen.getByTestId("plan-empower-interest")).toHaveTextContent(
      /R\$\s*15,20/,
    );
    // Cheque especial 9% on R$ 380 → R$ 34,20
    expect(screen.getByTestId("plan-cheque-interest")).toHaveTextContent(
      /R\$\s*34,20/,
    );
    // Rotativo 14% on R$ 380 → R$ 53,20
    expect(screen.getByTestId("plan-rotativo-interest")).toHaveTextContent(
      /R\$\s*53,20/,
    );
  });

  it("highlights the EmpowerFI card with a recommended badge", () => {
    render(
      <ContrafactualCompare amount={380} termMonths={1} empowerFiRate={0.04} />,
    );
    const empower = screen.getByTestId("plan-empower");
    expect(within(empower).getByText(/Recomendado/i)).toBeInTheDocument();
  });

  it("shows total savings vs overdraft as a separate line", () => {
    render(
      <ContrafactualCompare amount={380} termMonths={1} empowerFiRate={0.04} />,
    );
    // Savings = R$ 34,20 - R$ 15,20 = R$ 19,00
    const savings = screen.getByTestId("savings-vs-overdraft");
    expect(savings).toHaveTextContent(/R\$\s*19,00/);
    expect(savings).toHaveTextContent(/cheque especial/i);
  });

  it("recomputes when given a different principal", () => {
    render(
      <ContrafactualCompare
        amount={1000}
        termMonths={1}
        empowerFiRate={0.04}
      />,
    );
    // 4% of 1000 = R$ 40,00
    expect(screen.getByTestId("plan-empower-interest")).toHaveTextContent(
      /R\$\s*40,00/,
    );
    // Savings = 90 - 40 = R$ 50,00
    expect(screen.getByTestId("savings-vs-overdraft")).toHaveTextContent(
      /R\$\s*50,00/,
    );
  });
});
