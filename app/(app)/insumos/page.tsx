'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { InsumosList } from '@/components/insumos/InsumosList'
import { PreciosCascos } from '@/components/insumos/PreciosCascos'
import { PreciosFlejes } from '@/components/insumos/PreciosFlejes'
import { PreciosFundicion } from '@/components/insumos/PreciosFundicion'
import { PreciosChapa } from '@/components/insumos/PreciosChapa'

const TABS = [
  { id: 'lista',     label: 'Lista de insumos' },
  { id: 'cascos',    label: 'Precios Cascos' },
  { id: 'flejes',    label: 'Flejes y Caños' },
  { id: 'fundicion', label: 'Fundición y Cromado' },
  { id: 'chapa',     label: 'Chapa' },
]

export default function InsumosPage() {
  const [tab, setTab] = useState('lista')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Insumos</h1>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-6" />

      {tab === 'lista'     && <InsumosList />}
      {tab === 'cascos'    && <PreciosCascos />}
      {tab === 'flejes'    && <PreciosFlejes />}
      {tab === 'fundicion' && <PreciosFundicion />}
      {tab === 'chapa'     && <PreciosChapa />}
    </div>
  )
}
