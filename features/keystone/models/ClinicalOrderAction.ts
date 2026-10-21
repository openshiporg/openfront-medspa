import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'
export const ClinicalOrderAction=list({access:{operation:{query:permissions.canManageClinical,create:()=>false,update:()=>false,delete:()=>false},filter:{query:tenantFilter}},fields:{practice:relationship({ref:'Practice'}),order:relationship({ref:'ClinicalOrder.actions'}),actor:relationship({ref:'Provider'}),action:select({type:'enum',options:['hold','release','partially_fulfill','fulfill','revoke','expire','enter_in_error'].map(value=>({label:value,value})),validation:{isRequired:true}}),fromStatus:text({validation:{isRequired:true}}),toStatus:text({validation:{isRequired:true}}),reason:text({validation:{isRequired:true}}),evidence:json(),evidenceHash:text({validation:{isRequired:true}}),occurredAt:timestamp({validation:{isRequired:true}}),idempotencyKey:text({validation:{isRequired:true},isIndexed:'unique'}),...trackingFields}})
