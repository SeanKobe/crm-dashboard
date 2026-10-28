import { useState } from 'react'
import { leadsManagement } from '../../data/mock'
import { useWidgets } from '../../context/widgetsContext'
import { HorizontalBars } from '../charts/HorizontalBars'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { Card, CardHeader } from './Card'

export function LeadsManagementCard() {
  const [tab, setTab] = useState(leadsManagement.defaultTab)
  const { refreshKey } = useWidgets()
  return (
    <Card className="flex flex-col gap-3 px-[15px] py-4">
      <CardHeader title={leadsManagement.title} widgetId="leads" />
      <SegmentedTabs label="Lead breakdown" options={leadsManagement.tabs} value={tab} onChange={setTab} />
      <HorizontalBars key={refreshKey.leads ?? 0} rows={leadsManagement.rows[tab]} />
    </Card>
  )
}
