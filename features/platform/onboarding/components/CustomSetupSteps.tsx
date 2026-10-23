import React, { useState } from 'react';
import { ArrowLeft, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataCard } from './DataCard';
import seedData from '@/features/platform/onboarding/lib/seed.json';

interface CustomSetupStepsProps {
  currentJson?: any;
  onJsonUpdate?: (newJson: any) => void;
  onBack?: () => void;
}

function useCopyToClipboard(): [string | null, (text: string) => Promise<boolean>] {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = React.useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      return true;
    } catch (error) {
      console.warn('Copy failed', error);
      setCopiedText(null);
      return false;
    }
  }, []);

  return [copiedText, copy];
}

const requiredKeys = [
  'medspaInfo',
  'storefront',
  'resources',
  'services',
  'providers',
  'scheduleBlocks',
  'clients',
  'memberships',
  'appointments',
  'gallery',
  'paymentProviders',
];

function getCompleteSetupJson() {
  return seedData;
}

export function CustomSetupSteps({ currentJson, onJsonUpdate = () => {}, onBack }: CustomSetupStepsProps) {
  const [, copy] = useCopyToClipboard();
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [customJson, setCustomJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonApplied, setJsonApplied] = useState(false);

  const completeJson = currentJson || getCompleteSetupJson();

  const copyToClipboard = async (text: string, itemKey: string) => {
    const success = await copy(text);
    if (success) {
      setCopiedItems((prev) => ({ ...prev, [itemKey]: true }));
      setTimeout(() => {
        setCopiedItems((prev) => ({ ...prev, [itemKey]: false }));
      }, 2000);
    }
  };

  const generateAIPrompt = () => {
    return `Help me set up my med spa from this JSON. Keep every top-level key and the same structure.

Ask me for: practice name, address, phone, email, timezone and opening hours; the storefront display name and brand hue (0-360); my treatment categories; each treatment's name, duration in minutes and price in cents; my rooms; each provider's name, email, role (provider, esthetician, nurse, physician or assistant) and the treatments they perform; and each provider's weekly hours (dayOfWeek 0-6, Sunday is 0, times as HH:MM inside opening hours).

Rules: treatments that are bookable online (isPublic true) must be active, keep staffAuthorizationRequired false and the requires* flags false, and use rooms that are active and isPublic true. Treatments that need clinical authority stay isPublic false. Keep appointments empty. Lot-tracked products start at quantity 0. Keep Stripe isInstalled false.

Return one complete JSON object.`;
  };

  const validateAndApplyJson = () => {
    try {
      const parsed = JSON.parse(customJson);
      const missingKeys = requiredKeys.filter((key) => {
        if (key === 'medspaInfo' || key === 'storefront') return !parsed[key] || typeof parsed[key] !== 'object' || Array.isArray(parsed[key]);
        return !parsed[key] || !Array.isArray(parsed[key]);
      });

      if (missingKeys.length > 0) {
        setJsonError(`Missing required keys: ${missingKeys.join(', ')}`);
        return;
      }

      onJsonUpdate(parsed);
      setJsonApplied(true);
      setJsonError('');
    } catch (error) {
      setJsonError('That isn\'t valid JSON.');
    }
  };

  const steps = [
    {
      number: 1,
      title: 'Copy the setup data',
      description: 'The same data the sample med spa uses.',
      content: (
        <DataCard
          title="Setup data"
          content={JSON.stringify(completeJson, null, 2)}
          onCopy={copyToClipboard}
          copied={copiedItems.json || false}
          copyKey="json"
        />
      ),
    },
    {
      number: 2,
      title: 'Copy the AI prompt',
      description: 'Paste both into an AI assistant to fill in your practice.',
      content: (
        <DataCard
          title="AI prompt"
          content={generateAIPrompt()}
          onCopy={copyToClipboard}
          copied={copiedItems.prompt || false}
          copyKey="prompt"
        />
      ),
    },
    {
      number: 3,
      title: 'Check the rules',
      description: 'Prices are whole cents. Weekdays run 0-6, Sunday is 0.',
      content: null,
    },
    {
      number: 4,
      title: 'Paste your data',
      description: 'Apply it, then confirm setup.',
      content: (
        <div className="rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
            <span className="text-sm font-medium text-muted-foreground">Your setup data</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setCustomJson(text);
                  setJsonError('');
                } catch (error) {
                  console.error('Failed to paste:', error);
                }
              }}
              aria-label="Paste from clipboard"
              className="h-6 w-6 p-0 hover:bg-background/80"
            >
              <Clipboard className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
          <div className="bg-background">
            <Textarea
              placeholder="Paste JSON"
              value={customJson}
              onChange={(event) => {
                setCustomJson(event.target.value);
                setJsonError('');
              }}
              className="min-h-[220px] font-mono text-xs resize-none border-0 bg-transparent focus:outline-none p-4 rounded-none"
            />
          </div>
          {jsonError && (
            <div className="px-4 pb-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                <p className="text-xs text-destructive">{jsonError}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end px-4 py-2 bg-muted border-t">
            <Button size="sm" onClick={validateAndApplyJson} disabled={!customJson.trim()}>
              Apply
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {jsonApplied && onBack && (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setJsonApplied(false);
              onBack();
            }}
            className="h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      )}

      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            {index < steps.length - 1 && (
              <div className="absolute left-3 top-3 bottom-0 w-[1px] bg-border" />
            )}
            <div className="flex items-center space-x-3 mb-2 relative">
              <div className="inline-flex size-6 items-center justify-center rounded-sm border border-border bg-background text-sm text-foreground shadow-sm z-10">
                {step.number}
              </div>
              <Label className="text-sm font-medium text-foreground">{step.title}</Label>
            </div>
            <div className="pl-9">
              <div className="pb-6">
                <p className="text-xs text-muted-foreground mb-3">{step.description}</p>
                {step.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
