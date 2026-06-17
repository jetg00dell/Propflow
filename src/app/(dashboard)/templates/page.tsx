import { createAdminClient } from '@/lib/supabase/server'
import TemplatesClient from './TemplatesClient'

const CATEGORIES = [
  'lease_agreement',
  'addenda',
  'disclosure_lead',
  'disclosure_radon',
  'disclosure_brokerage',
  'checklist_movein',
  'checklist_moveout',
]

export default async function TemplatesPage() {
  const admin = createAdminClient()

  const results = await Promise.all(
    CATEGORIES.map(async (category) => {
      const { data } = await admin.storage
        .from('document-templates')
        .list(category, { limit: 1 })
      if (data && data.length > 0) {
        return { category, filename: data[0].name }
      }
      return null
    })
  )

  const initialTemplates = results.filter((r): r is { category: string; filename: string } => r !== null)

  return <TemplatesClient initialTemplates={initialTemplates} />
}
