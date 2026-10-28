import { SegmentedFilter, type SegmentedFilterProps } from './SegmentedFilter'

// Full-width variant of the segmented control (Status / Sources / Qualification).
export function SegmentedTabs<T extends string>(props: Omit<SegmentedFilterProps<T>, 'fill'>) {
  return <SegmentedFilter fill {...props} />
}
