/*
 * ENERGIZE — navigation model
 *
 * One definition of every page: its identifier, navigation label, folio
 * number and masthead copy. The shell, the router and the pages all read
 * from here so wording never drifts between them.
 */

import type { ReactNode } from 'react'
import {
  InvestigateIcon,
  ModelIcon,
  OptimizeIcon,
  OverviewIcon,
  PredictionIcon,
  TwinIcon,
} from '../components/layout/icons'

export type PageId =
  | 'overview'
  | 'prediction'
  | 'waste'
  | 'twin'
  | 'optimization'
  | 'model-lab'

export type PageMeta = {
  id: PageId
  label: string
  folio: string
  eyebrow: string
  title: string
  description: string
}

export const PAGES: Record<PageId, PageMeta> = {
  overview: {
    id: 'overview',
    label: 'Overview',
    folio: '01',
    eyebrow: 'Energy intelligence',
    title: 'Your energy, understood.',
    description:
      'A measured view of household electricity consumption, model performance and the signals worth acting on.',
  },
  prediction: {
    id: 'prediction',
    label: 'Energy Prediction',
    folio: '02',
    eyebrow: 'Forecasting workspace',
    title: 'Predict what comes next.',
    description:
      'Run the trained models against real historical readings, then extend them into a recursive forward forecast.',
  },
  waste: {
    id: 'waste',
    label: 'Waste Investigator',
    folio: '03',
    eyebrow: 'Anomaly investigation',
    title: 'Readings worth a second look.',
    description:
      'Hourly consumption scored against the household’s own baseline for that hour of day, to surface the unusual.',
  },
  twin: {
    id: 'twin',
    label: 'Digital Twin',
    folio: '04',
    eyebrow: 'Household energy profile',
    title: 'The shape of your consumption.',
    description:
      'The observed pattern of the household, hour by hour and day by day, with the forecast layered on top.',
  },
  optimization: {
    id: 'optimization',
    label: 'Optimization Lab',
    folio: '05',
    eyebrow: 'Scenario planning',
    title: 'Test an intervention.',
    description:
      'Run hypothetical reduction scenarios against the model forecast and compare the estimated savings side by side.',
  },
  'model-lab': {
    id: 'model-lab',
    label: 'Model Lab',
    folio: '06',
    eyebrow: 'Model evaluation',
    title: 'How the models compare.',
    description:
      'Verified error metrics, the evaluation window they were measured in, and the features each model leans on.',
  },
}

export type NavItem = {
  id: PageId
  label: string
  icon: ReactNode
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [{ id: 'overview', label: PAGES.overview.label, icon: <OverviewIcon /> }],
  },
  {
    label: 'Forecasting',
    items: [
      { id: 'prediction', label: PAGES.prediction.label, icon: <PredictionIcon /> },
      { id: 'optimization', label: PAGES.optimization.label, icon: <OptimizeIcon /> },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { id: 'waste', label: PAGES.waste.label, icon: <InvestigateIcon /> },
      { id: 'twin', label: PAGES.twin.label, icon: <TwinIcon /> },
      { id: 'model-lab', label: PAGES['model-lab'].label, icon: <ModelIcon /> },
    ],
  },
]
