'use client';

import React from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CircleCheck,
  Loader2,
  Package,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge-button';
import { CustomSetupSteps } from './CustomSetupSteps';
import { PracticeDetailsFields } from './PracticeDetailsFields';
import { SectionRenderer } from './SectionRenderer';
import { useOnboardingState } from '../hooks/useOnboardingState';
import { useOnboardingApi } from '../hooks/useOnboardingApi';
import { getItemsFromJsonData } from '../utils/dataUtils';
import { MEDSPA_TEMPLATES, SECTION_DEFINITIONS } from '../config/templates';

interface OnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const getDisplayNames = (selectedTemplate: 'full' | 'minimal' | 'custom', currentJsonData: any): Record<string, string[]> => {
  if (!currentJsonData) return MEDSPA_TEMPLATES[selectedTemplate].displayNames;
  return Object.fromEntries(SECTION_DEFINITIONS.map((section) => [section.type, getItemsFromJsonData(currentJsonData, section.type)]));
};

const templateOptions = (['full', 'minimal', 'custom'] as const).map((value) => ({
  value,
  title: MEDSPA_TEMPLATES[value].name,
  description: MEDSPA_TEMPLATES[value].description,
  icon: value === 'full' ? Building2 : value === 'minimal' ? Package : CircleCheck,
}));

const OnboardingDialog: React.FC<OnboardingDialogProps> = ({ isOpen, onClose }) => {
  const onboardingState = useOnboardingState();
  const {
    step,
    selectedTemplate,
    currentJsonData,
    customJsonApplied,
    progressMessage,
    loadingItems,
    completedItems,
    error,
    itemErrors,
    isLoading,
    setStep,
    setSelectedTemplate,
    setCurrentJsonData,
    setCustomJsonApplied,
    setProgress,
    setItemLoading,
    setItemCompleted,
    setItemError,
    setError,
    setIsLoading,
    resetOnboardingState,
  } = onboardingState;

  const { runOnboarding } = useOnboardingApi({
    selectedTemplate,
    currentJsonData,
    completedItems,
    setProgress,
    setItemLoading,
    setItemCompleted,
    setItemError,
    setStep,
    setError,
    setIsLoading,
    resetOnboardingState,
  });

  if (!isOpen) return null;

  const displayNames = getDisplayNames(selectedTemplate, currentJsonData);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-[95vw] flex-col overflow-hidden p-0 gap-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-4 sm:px-6 py-4 mb-0 shrink-0">
          <DialogTitle>Practice setup</DialogTitle>
          <DialogDescription className="sr-only">Choose how to create your practice, then confirm.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="order-1 flex shrink-0 flex-col lg:order-none lg:w-80 lg:justify-between lg:border-r">
            <div className="flex-1">
              <div className="p-4 sm:p-6">
                <div className="flex items-center space-x-3">
                  <div className="inline-flex shrink-0 items-center justify-center rounded-sm bg-muted p-3">
                    <Sparkles className="size-5 text-foreground" aria-hidden={true} />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium text-foreground">Practice setup</h3>
                    <p className="text-sm text-muted-foreground">
                      {step === 'done' ? 'Practice created' : selectedTemplate === 'custom' ? 'Custom setup data' : 'Choose a starting point'}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />

                {step === 'done' ? (
                  <>
                    <div className="flex items-center space-x-2 text-sm text-emerald-600 dark:text-emerald-500 mb-4">
                      <CircleCheck className="h-4 w-4 fill-emerald-500 text-background" />
                      <span>{currentJsonData?.storefront?.isPublished === false ? 'Storefront saved, not published' : 'Storefront published'}</span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <SummaryLine count={displayNames.services?.length || 0} label="treatment" />
                      <SummaryLine count={displayNames.resources?.length || 0} label="room" />
                      <SummaryLine count={displayNames.staff?.length || 0} label="provider" />
                    </div>
                  </>
                ) : !isLoading ? (
                  <>
                    <h4 className="text-sm font-medium text-foreground mb-4">Start with</h4>

                    <div className="block lg:hidden">
                      <Select
                        value={selectedTemplate}
                        onValueChange={(value) => setSelectedTemplate(value as 'minimal' | 'full' | 'custom')}
                      >
                        <SelectTrigger className="w-full h-auto py-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {templateOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col items-start text-left">
                                <span className="font-medium">{option.title}</span>
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="hidden lg:block">
                      <RadioGroup
                        value={selectedTemplate}
                        onValueChange={(value) => setSelectedTemplate(value as 'minimal' | 'full' | 'custom')}
                        className="space-y-4"
                      >
                        {templateOptions.map((option) => {
                          const Icon = option.icon;
                          const isSelected = selectedTemplate === option.value;

                          return (
                            <div
                              key={option.value}
                              className={`border p-4 rounded-md transition-colors cursor-pointer ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'hover:border-blue-200'
                              }`}
                              onClick={() => setSelectedTemplate(option.value)}
                            >
                              <div className="flex gap-4">
                                <div className="flex-shrink-0 mt-[3px]">
                                  <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                                </div>
                                <div className="flex-1">
                                  <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                                    <div className="font-medium text-base mb-1">{option.title}</div>
                                    <div className="text-sm text-muted-foreground">{option.description}</div>
                                  </Label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-medium text-foreground">
                      Creating practice
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{progressMessage}</p>
                  </>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col border-t mt-auto">
              {error && !isLoading && step !== 'done' && <ErrorBadge message={error} />}
              <DialogActions step={step} isLoading={isLoading} runOnboarding={runOnboarding} />
            </div>
          </div>

          <div className="order-2 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:order-none">
            {selectedTemplate === 'custom' && step === 'template' && !customJsonApplied ? (
              <CustomSetupSteps
                currentJson={currentJsonData}
                onJsonUpdate={(newJsonData) => {
                  setCurrentJsonData(newJsonData);
                  setCustomJsonApplied(true);
                }}
                onBack={() => setCustomJsonApplied(false)}
              />
            ) : (
              <>
              {step === 'template' && selectedTemplate !== 'custom' && !isLoading ? <PracticeDetailsFields data={currentJsonData} onChange={setCurrentJsonData} /> : null}
              <SectionRenderer
                sections={SECTION_DEFINITIONS}
                selectedTemplate={selectedTemplate}
                isLoading={isLoading}
                loadingItems={loadingItems}
                completedItems={completedItems}
                itemErrors={itemErrors}
                error={error}
                step={step}
                currentJsonData={currentJsonData}
              />
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col border-t lg:hidden">
          {error && !isLoading && step !== 'done' && <ErrorBadge message={error} />}
          <DialogActions step={step} isLoading={isLoading} runOnboarding={runOnboarding} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

function SummaryLine({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center space-x-2 text-muted-foreground">
      <CircleCheck className="h-4 w-4 fill-muted-foreground text-background" />
      <span className="font-medium">
        {count} {label}{count === 1 ? '' : 's'} created
      </span>
    </div>
  );
}

function ErrorBadge({ message }: { message: string }) {
  return (
    <Badge color="rose" className="rounded-none gap-3 text-sm border-b" role="alert">
      <AlertCircle className="size-4 shrink-0 sm:size-5" />
      <span className="text-xs sm:text-sm">
        Setup failed and nothing was created. {message}
      </span>
    </Badge>
  );
}

function DialogActions({
  step,
  isLoading,
  runOnboarding,
}: {
  step: 'template' | 'progress' | 'done';
  isLoading: boolean;
  runOnboarding: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      {step === 'done' ? (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogClose>
          <Button asChild className="w-full sm:w-auto">
            <a href="/" target="_blank" rel="noopener noreferrer">
              View storefront
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </a>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isLoading} className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          {isLoading ? (
            <Button disabled className="w-full sm:w-auto">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </Button>
          ) : (
            <Button aria-label="Confirm practice setup" onClick={runOnboarding} className="min-h-11 w-full sm:w-auto">
              Confirm
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default OnboardingDialog;
