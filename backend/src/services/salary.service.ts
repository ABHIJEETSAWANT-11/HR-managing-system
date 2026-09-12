import { Request, Response } from "express";

/**
 * Salary calculation service — deterministic, plain code.
 * NOT a Gemini call. All values computed server-side.
 */

/**
 * Compute monthlyGross from annualCTC by dividing by 12.
 * Returns the computed value (not trusting client input).
 */
export const computeMonthlyGross = (annualCTC: number): number => {
  return Math.round(annualCTC / 12 * 100) / 100; // 2 decimal precision
};

/**
 * Validate that the sum of all salary components equals annualCTC within a small rounding tolerance (e.g. ±1).
 * Returns { valid: boolean, mismatch } where mismatch is the absolute difference.
 */
export const validateSalaryComponents = (
  annualCTC: number,
  components: {
    basicSalary?: number;
    hra?: number;
    specialAllowance?: number;
    variablePay?: number;
    performanceBonus?: number;
    joiningBonus?: number;
    employerPF?: number;
    gratuity?: number;
    insurance?: number;
    otherBenefits?: number[];
  }
): { valid: boolean; mismatch: number } => {
  let total = 0;

  if (components.basicSalary !== undefined) total += components.basicSalary;
  if (components.hra !== undefined) total += components.hra;
  if (components.specialAllowance !== undefined) total += components.specialAllowance;
  if (components.variablePay !== undefined) total += components.variablePay;
  if (components.performanceBonus !== undefined) total += components.performanceBonus;
  if (components.joiningBonus !== undefined) total += components.joiningBonus;
  if (components.employerPF !== undefined) total += components.employerPF;
  if (components.gratuity !== undefined) total += components.gratuity;
  if (components.insurance !== undefined) total += components.insurance;
  if (components.otherBenefits && components.otherBenefits.length > 0) {
    components.otherBenefits.forEach((benefit) => {
      total += benefit;
    });
  }

  const mismatch = Math.abs(annualCTC - total);
  const valid = mismatch <= 1; // ±1 tolerance

  return { valid, mismatch };
};

/**
 * Compute monthlyGross and validate components on offer creation.
 * This should be called before saving an Offer doc.
 */
export const validateAndComputeOfferSalary = (
  annualCTC: number,
  salaryStructure: {
    annualCTC: number;
    basicSalary?: number;
    hra?: number;
    specialAllowance?: number;
    variablePay?: number;
    performanceBonus?: number;
    joiningBonus?: number;
    employerPF?: number;
    gratuity?: number;
    insurance?: number;
    otherBenefits?: number[];
    monthlyGross?: number;
  }
) => {
  const { valid, mismatch } = validateSalaryComponents(annualCTC, {
    basicSalary: salaryStructure.basicSalary,
    hra: salaryStructure.hra,
    specialAllowance: salaryStructure.specialAllowance,
    variablePay: salaryStructure.variablePay,
    performanceBonus: salaryStructure.performanceBonus,
    joiningBonus: salaryStructure.joiningBonus,
    employerPF: salaryStructure.employerPF,
    gratuity: salaryStructure.gratuity,
    insurance: salaryStructure.insurance,
    otherBenefits: salaryStructure.otherBenefits,
  });

  const monthlyGross = computeMonthlyGross(annualCTC);

  return {
    valid,
    mismatch,
    monthlyGross,
    // Set monthlyGross in the salaryStructure if not provided
    salaryStructure: {
      ...salaryStructure,
      monthlyGross: salaryStructure.monthlyGross || monthlyGross,
    },
  };
};