import { useState } from 'react';
import { MEDSPA_TEMPLATES } from '../config/templates';
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

const initialItemsState: Record<string, string[]> = {
  medspaInfo: [],
  categories: [],
  services: [],
  staff: [],
  clients: [],
  intakeForms: [],
  memberships: [],
  retail: [],
  appointments: [],
};

const getTemplateData = (template: TemplateType) =>
  getSeedForTemplate(template === 'custom' ? 'minimal' : template, seedData);

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

  const getDisplayNamesFromData = (data: any) => ({
    medspaInfo: getItemsFromJsonData(data, 'medspaInfo'),
    categories: getItemsFromJsonData(data, 'categories'),
    services: getItemsFromJsonData(data, 'services'),
    staff: getItemsFromJsonData(data, 'staff'),
    clients: getItemsFromJsonData(data, 'clients'),
    intakeForms: getItemsFromJsonData(data, 'intakeForms'),
    memberships: getItemsFromJsonData(data, 'memberships'),
    retail: getItemsFromJsonData(data, 'retail'),
    appointments: getItemsFromJsonData(data, 'appointments'),
  });

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

  const markSectionsCompletedBefore = (currentSection: string) => {
    const order = ['medspaInfo', 'categories', 'services', 'staff', 'clients', 'intakeForms', 'memberships', 'retail', 'appointments'];
    const currentIndex = order.indexOf(currentSection);
    if (currentIndex <= 0) return;

    const displayNames = state.currentJsonData
      ? getDisplayNamesFromData(state.currentJsonData)
      : MEDSPA_TEMPLATES[state.selectedTemplate].displayNames;

    setState((prev) => {
      const completedItems = { ...prev.completedItems };
      const loadingItems = { ...prev.loadingItems };

      order.slice(0, currentIndex).forEach((section) => {
        completedItems[section] = [...(displayNames as any)[section]];
        loadingItems[section] = [];
      });

      return { ...prev, completedItems, loadingItems };
    });
  };

  const setProgress = (message: string) => {
    setState((prev) => ({ ...prev, progressMessage: message }));

    if (message.includes('service categories')) markSectionsCompletedBefore('categories');
    else if (message.includes('services and variants')) markSectionsCompletedBefore('services');
    else if (message.includes('staff and schedules')) markSectionsCompletedBefore('staff');
    else if (message.includes('clients and CRM')) markSectionsCompletedBefore('clients');
    else if (message.includes('intake and consent')) markSectionsCompletedBefore('intakeForms');
    else if (message.includes('memberships and packages')) markSectionsCompletedBefore('memberships');
    else if (message.includes('retail products')) markSectionsCompletedBefore('retail');
    else if (message.includes('sample appointments')) markSectionsCompletedBefore('appointments');
    else if (message.includes('complete')) {
      const displayNames = state.currentJsonData
        ? getDisplayNamesFromData(state.currentJsonData)
        : MEDSPA_TEMPLATES[state.selectedTemplate].displayNames;

      setState((prev) => ({
        ...prev,
        loadingItems: { ...initialItemsState },
        completedItems: {
          medspaInfo: [...displayNames.medspaInfo],
          categories: [...displayNames.categories],
          services: [...displayNames.services],
          staff: [...displayNames.staff],
          clients: [...displayNames.clients],
          intakeForms: [...displayNames.intakeForms],
          memberships: [...displayNames.memberships],
          retail: [...displayNames.retail],
          appointments: [...displayNames.appointments],
        },
      }));
    }
  };

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
