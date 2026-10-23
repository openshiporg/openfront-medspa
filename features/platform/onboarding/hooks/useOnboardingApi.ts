import { GraphQLClient, gql } from 'graphql-request';
import { SECTION_DEFINITIONS } from '../config/templates';
import { getItemsFromJsonData } from '../utils/dataUtils';
import { TemplateType, OnboardingStep } from './useOnboardingState';

const GRAPHQL_ENDPOINT = '/api/graphql';

interface OnboardingApiProps {
  selectedTemplate: TemplateType;
  currentJsonData: any;
  completedItems: Record<string, string[]>;
  setProgress: (message: string) => void;
  setItemLoading: (type: string, item: string) => void;
  setItemCompleted: (type: string, item: string) => void;
  setItemError: (type: string, item: string, errorMessage: string) => void;
  setStep: (step: OnboardingStep) => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  resetOnboardingState: () => void;
}

type RunMedSpaOnboardingResult = {
  success: boolean;
  completed: boolean;
  created: number;
  reused: number;
  locationId: string | null;
  error: string | null;
};

const RUN_MEDSPA_ONBOARDING = gql`
  mutation RunMedSpaOnboarding($seed: JSON) {
    runMedSpaOnboarding(seed: $seed) {
      success
      completed
      created
      reused
      locationId
      error
    }
  }
`;

function errorMessage(error: any) {
  if (error?.response?.errors?.length) {
    return error.response.errors.map((item: any) => item.message || JSON.stringify(item)).join('\n');
  }
  return error?.message || 'Setup failed. Nothing was created; try again.';
}

export function useOnboardingApi({
  currentJsonData,
  setProgress,
  setItemLoading,
  setItemCompleted,
  setItemError,
  setStep,
  setError,
  setIsLoading,
  resetOnboardingState,
}: OnboardingApiProps) {
  const runOnboarding = async () => {
    setIsLoading(true);
    setError(null);
    resetOnboardingState();
    setStep('progress');
    setProgress('Creating your practice');

    const pending: Array<[string, string]> = [];
    try {
      for (const section of SECTION_DEFINITIONS) {
        for (const item of getItemsFromJsonData(currentJsonData, section.type)) {
          setItemLoading(section.type, item);
          pending.push([section.type, item]);
        }
      }

      const client = new GraphQLClient(GRAPHQL_ENDPOINT, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await client.request<{ runMedSpaOnboarding: RunMedSpaOnboardingResult }>(
        RUN_MEDSPA_ONBOARDING,
        { seed: currentJsonData },
      );
      const result = response.runMedSpaOnboarding;
      if (!result.success || !result.completed) throw new Error(result.error || 'Setup did not finish. Nothing was created; try again.');

      for (const section of SECTION_DEFINITIONS) {
        for (const item of getItemsFromJsonData(currentJsonData, section.type)) {
          setItemCompleted(section.type, item);
        }
      }
      setProgress(`${result.created} records created`);
      setStep('done');
    } catch (error) {
      const message = errorMessage(error);
      // The setup is one transaction: every pending item failed together.
      for (const [type, item] of pending) setItemError(type, item, message);
      setError(message);
      setStep('template');
    } finally {
      setIsLoading(false);
    }
  };

  return { runOnboarding };
}
