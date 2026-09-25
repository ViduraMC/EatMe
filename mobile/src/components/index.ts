/**
 * The EatMe component kit. Screens import from here, never from a file
 * inside this folder, so a component can be reorganised without touching
 * thirty screens.
 *
 * Documented with the reasoning behind each one in docs/ux/design-system.md.
 */

// Foundations
export { AppText, type AppTextProps } from './AppText';
export { Icon, type IconName } from './Icon';
export { PressableScale } from './PressableScale';
export { Logo } from './Logo';
export {
  Illustration,
  LogoMark,
  artColors,
  type ArtName,
} from './illustrations/Illustration';

// Layout
export { Screen, ScreenContainer, LargeTitle, TopBar, useScrollY } from './Screen';
export { SectionHeader } from './SectionHeader';
export { Divider } from './Divider';
export { EatMeTabBar, type TabIcons } from './TabBar';

// Actions
export { Button, type ButtonProps, type ButtonVariant } from './Button';
export { IconButton } from './IconButton';
export { SlideToConfirm } from './SlideToConfirm';

// Inputs
export { TextField, Input, type TextFieldProps } from './TextField';
export { SearchBar } from './SearchBar';
export { SegmentedControl, type Segment } from './SegmentedControl';
export { Chip, ChipRow } from './Chip';
export { QuantityStepper } from './QuantityStepper';
export { Toggle } from './Toggle';
export { Checkbox } from './Checkbox';
export { ChoiceCard } from './ChoiceCard';
export { DateTimeField, type DatePreset } from './DateTimeField';

// Display
export { Card } from './Card';
export { Badge, StatusPill } from './Badge';
export { UrgencyBadge } from './UrgencyBadge';
export { FreshnessRing } from './FreshnessRing';
export { ProgressBar } from './ProgressBar';
export { StatTile } from './StatTile';
export { Avatar } from './Avatar';
export { ListRow } from './ListRow';
export { InfoBanner } from './InfoBanner';
export { Timeline, type TimelineStep, type StepState } from './Timeline';

// Feedback
export { Skeleton, SkeletonCard, SkeletonList } from './Skeleton';
export { EmptyState, ErrorState } from './EmptyState';
export { ToastProvider, useToast, type ToastOptions } from './Toast';
export { BottomSheet } from './BottomSheet';
export { ConfirmProvider, useConfirm, type ConfirmOptions } from './ConfirmSheet';
