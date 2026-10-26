'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from '@/features/platform/components/pill';
import { saveResource } from '../actions/resources';
import { RESOURCE_TYPE_LABELS, type PlatformResource, type ResourceFormOptions, type ResourceSaveState } from '../types';

const initialState: ResourceSaveState = { status: 'idle', message: '' };

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

/** Create or edit a room, device or piece of equipment. */
export function ResourceFormSheet({ resource, options }: { resource?: PlatformResource; options: ResourceFormOptions }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveResource, initialState);
  const [type, setType] = useState(resource?.type || 'room');
  // Fresh key per opened form; a resubmit of the same form reuses it.
  const requestKey = useMemo(() => (open ? crypto.randomUUID() : ''), [open]);
  const selected = new Set(resource?.services.map((service) => service.id) || []);
  const isDevice = type === 'device' || type === 'equipment';

  useEffect(() => { if (state.status === 'saved') setOpen(false); }, [state]);

  return (
    <>
      <button type="button" className={pillClass(resource ? 'raised' : 'primary', resource ? 'sm' : 'md')} onClick={() => setOpen(true)}>
        {resource ? <><Pencil />Edit</> : <><Plus />New resource</>}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{resource ? `Edit ${resource.name}` : 'New resource'}</SheetTitle>
            <SheetDescription className="sr-only">Room, device or equipment details</SheetDescription>
          </SheetHeader>
          <form action={action} className="grid gap-4 px-5 py-5">
            <input type="hidden" name="resourceId" value={resource?.id || ''} />
            <input type="hidden" name="expectedRevision" value={resource?.revision ?? ''} />
            <input type="hidden" name="idempotencyKey" value={requestKey} />
            <label className={fieldLabelClass}>Name<input className={inputClass} name="name" required maxLength={120} defaultValue={resource?.name || ''} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldLabelClass}>Type
                <select className={inputClass} name="type" value={type} onChange={(event) => setType(event.target.value)} disabled={Boolean(resource) && (resource?.type === 'device' || resource?.type === 'equipment')}>
                  {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className={fieldLabelClass}>Capacity<input className={inputClass} name="capacity" type="number" min={1} max={50} step={1} required defaultValue={resource?.capacity || 1} /></label>
            </div>
            {resource && (resource.type === 'device' || resource.type === 'equipment') ? <input type="hidden" name="type" value={resource.type} /> : null}
            <label className={fieldLabelClass}>Location
              <select className={inputClass} name="locationId" required defaultValue={resource?.location?.id || options.locations[0]?.id || ''}>
                {!options.locations.length ? <option value="">No active location</option> : null}
                {options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-xs font-medium text-muted-foreground">Treatments that need it</legend>
              {options.services.length ? (
                <div className="grid max-h-48 gap-1 overflow-y-auto rounded-[6px] border p-2">
                  {options.services.map((service) => (
                    <label key={service.id} className="flex min-h-9 items-center gap-2.5 rounded-[5px] px-2 text-sm hover:bg-muted/50">
                      <input type="checkbox" name="serviceIds" value={service.id} defaultChecked={selected.has(service.id)} className="size-4" />
                      {service.name}
                    </label>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No treatments yet</p>}
            </fieldset>
            <label className="flex min-h-10 items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" name="isPublic" defaultChecked={resource ? resource.isPublic === true : true} className="size-4" />Bookable online
            </label>
            {isDevice ? (
              <div className="grid gap-4 rounded-[6px] border bg-muted/20 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={fieldLabelClass}>Manufacturer<input className={inputClass} name="manufacturer" maxLength={120} defaultValue={resource?.manufacturer || ''} /></label>
                  <label className={fieldLabelClass}>Model<input className={inputClass} name="model" maxLength={120} defaultValue={resource?.model || ''} /></label>
                </div>
                <label className={fieldLabelClass}>Serial number<input className={inputClass} name="serialNumber" maxLength={120} defaultValue={resource?.serialNumber || ''} /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={fieldLabelClass}>Maintenance due<input className={inputClass} name="maintenanceDueAt" type="date" defaultValue={dateInput(resource?.maintenanceDueAt)} /></label>
                  <label className={fieldLabelClass}>Calibration due<input className={inputClass} name="calibrationDueAt" type="date" defaultValue={dateInput(resource?.calibrationDueAt)} /></label>
                </div>
                {!resource ? <p className="text-xs text-muted-foreground">Starts in acceptance testing</p> : null}
              </div>
            ) : null}
            <label className={fieldLabelClass}>Notes<textarea className={textareaClass} name="notes" maxLength={2000} defaultValue={resource?.notes || ''} /></label>
            {state.status === 'error' ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{state.message}</p> : null}
            <div className={cn(trackClass, 'self-start')}>
              <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className={pillClass('primary')} disabled={pending || !options.locations.length}>{pending ? 'Saving' : resource ? 'Save' : 'Add resource'}</button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
