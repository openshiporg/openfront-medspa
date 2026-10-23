import { useState } from 'react';
import { getItemsFromJsonData, getSeedForTemplate } from '../utils/dataUtils';
import seedData from '../lib/seed.json';

export type OnboardingStep = 'template' | 'progress' | 'done';
export type TemplateType = 'full' | 'minimal' | 'custom';

export interface OnboardingState {
  step: OnboardingStep;
  selectedTemplate: TemplateType;
  currentJsonData: any;
  customJsonApplied: boolean;
  progressMessage: string;
  loadingItems: Record<string, string[]>;
  completedItems: Record<string, string[]>;
  error: string | null;
  itemErrors: Record<string, Record<string, string | undefined>>;
  isLoading: boolean;
}

const SECTION_KEYS = ['medspaInfo', 'categories', 'resources', 'services', 'staff', 'intakeForms', 'retail'] as const;

const initialItemsState: Record<string, string[]> = Object.fromEntries(SECTION_KEYS.map((key) => [key, []]));

const getTemplateData = (template: TemplateType) =>
  getSeedForTemplate(template === 'custom' ? 'full' : template, seedData);

export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState>({
    step: 'template',
    selectedTemplate: 'full',
    currentJsonData: getTemplateData('full'),
    customJsonApplied: false,
    progressMessage: '',
    loadingItems: { ...initialItemsState },
    completedItems: { ...initialItemsState },
    error: null,
    itemErrors: {},
    isLoading: false,
  });

  const getDisplayNamesFromData = (data: any): Record<string, string[]> =>
    Object.fromEntries(SECTION_KEYS.map((key) => [key, getItemsFromJsonData(data, key)]));

  const setStep = (step: OnboardingStep) => setState((prev) => ({ ...prev, step }));
  const setSelectedTemplate = (template: TemplateType) => setState((prev) => ({
    ...prev,
    selectedTemplate: template,
    currentJsonData: getTemplateData(template),
    customJsonApplied: false,
  }));
  const setCurrentJsonData = (data: any) => setState((prev) => ({ ...prev, currentJsonData: data }));
  const setCustomJsonApplied = (applied: boolean) => setState((prev) => ({ ...prev, customJsonApplied: applied }));
  const setIsLoading = (loading: boolean) => setState((prev) => ({ ...prev, isLoading: loading }));
  const setError = (error: string | null) => setState((prev) => ({ ...prev, error }));

  const setProgress = (message: string) => setState((prev) => ({ ...prev, progressMessage: message }));

  const setLoadingItems = (items: Record<string, string[]>) => setState((prev) => ({ ...prev, loadingItems: items }));
  const setCompletedItems = (items: Record<string, string[]>) => setState((prev) => ({ ...prev, completedItems: items }));
  const setItemErrors = (errors: Record<string, Record<string, string | undefined>>) => setState((prev) => ({ ...prev, itemErrors: errors }));

  const setItemLoading = (type: string, item: string) => {
    setState((prev) => ({
      ...prev,
      loadingItems: {
        ...prev.loadingItems,
        [type]: [...(prev.loadingItems[type] || []), item],
      },
      itemErrors: {
        ...prev.itemErrors,
        [type]: {
          ...(prev.itemErrors[type] || {}),
          [item]: undefined,
        },
      },
    }));
  };

  const setItemCompleted = (type: string, item: string) => {
    setState((prev) => ({
      ...prev,
      loadingItems: {
        ...prev.loadingItems,
        [type]: (prev.loadingItems[type] || []).filter((existing) => existing !== item),
      },
      completedItems: {
        ...prev.completedItems,
        [type]: Array.from(new Set([...(prev.completedItems[type] || []), item])),
      },
      itemErrors: {
        ...prev.itemErrors,
        [type]: {
          ...(prev.itemErrors[type] || {}),
          [item]: undefined,
        },
      },
    }));
  };

  const setItemError = (type: string, item: string, errorMessage: string) => {
    setState((prev) => ({
      ...prev,
      loadingItems: {
        ...prev.loadingItems,
        [type]: (prev.loadingItems[type] || []).filter((existing) => existing !== item),
      },
      itemErrors: {
        ...prev.itemErrors,
        [type]: {
          ...(prev.itemErrors[type] || {}),
          [item]: errorMessage,
        },
      },
    }));
  };

  const resetOnboardingState = () => {
    setState((prev) => ({
      ...prev,
      error: null,
      itemErrors: {},
      loadingItems: { ...initialItemsState },
      completedItems: { ...initialItemsState },
    }));
  };

  return {
    ...state,
    setStep,
    setSelectedTemplate,
    setCurrentJsonData,
    setCustomJsonApplied,
    setIsLoading,
    setError,
    setProgress,
    setLoadingItems,
    setCompletedItems,
    setItemErrors,
    setItemLoading,
    setItemCompleted,
    setItemError,
    resetOnboardingState,
    getDisplayNamesFromData,
  };
}
