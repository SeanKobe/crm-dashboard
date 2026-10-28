import type { KeyboardEventHandler, Ref, RefCallback } from 'react'
import type { IconComponent, Tone } from './common'

// ---- Figma component variants
export type ButtonVariant = 'secondary' | 'primary' | 'destructive'
/** Figma "Button" States. Hover, Pressed and Focus come from CSS pseudo-classes; these are the ones a prop can force. */
export type ButtonState = 'default' | 'disabled' | 'loading'
/** xs 28, sm 32 (card "more"), md 36 (Figma IconButton component), lg 38 (header actions on the Dashboard frame). */
export type IconButtonSize = 'lg' | 'md' | 'sm' | 'xs'
export type AvatarSize = 'S' | 'M' | 'L' | 'LG' | 'XL'
export type SpinnerSize = 'S' | 'M' | 'L'
export type SpinnerTone = 'primary' | 'neutral' | 'inverse'
export type ToastType = 'success' | 'error' | 'info' | 'warning'
export type SkeletonVariant = 'chart' | 'kpi'
export type CountTrigger = 'view' | 'mount'
export type TooltipSide = 'top' | 'bottom' | 'right'

// ---- Menus
interface TriggerAttrs {
  'aria-haspopup'?: 'menu' | 'dialog'
  'aria-expanded'?: boolean
  onClick?: () => void
  onKeyDown?: KeyboardEventHandler<HTMLElement>
}
/** What `Menu` hands to its trigger renderer. The ref is a callback so it fits any element. */
export interface MenuTriggerProps extends TriggerAttrs {
  ref: RefCallback<HTMLElement>
}
/** What Button / IconButton accept to act as a menu trigger. */
export interface TriggerBinding<E extends HTMLElement> extends TriggerAttrs {
  ref?: Ref<E>
}

export interface MenuAction {
  type?: undefined
  id?: string
  label: string
  icon?: IconComponent
  checked?: boolean
  /** With `checked`: one of a single-choice group (role menuitemradio), e.g. the stage in "Move to". */
  radio?: boolean
  disabled?: boolean
  danger?: boolean
  keepOpen?: boolean
  /** Renders the row as an on/off switch (Figma "Menu Row Toggle"). */
  toggle?: boolean
  /** Initial avatar instead of an icon (account menu). */
  avatar?: { initial: string; tone: Tone }
  /** Keyboard hint on the right, e.g. "Cmd+K". */
  hint?: string
  onSelect?: () => void
}
export interface MenuSeparator {
  type: 'separator'
}
export interface MenuLabel {
  type: 'label'
  label: string
}
export type MenuEntry = MenuAction | MenuSeparator | MenuLabel

// ---- Toasts
export interface ToastInput {
  type?: ToastType
  title: string
  message?: string
  /** Milliseconds on screen (default 3500). */
  duration?: number
  /** Inline text button (Figma "Toast Action"), e.g. Undo. Clicking it also dismisses the toast. */
  action?: { label: string; onClick: () => void }
}
export interface ToastData extends ToastInput {
  id: number
  type: ToastType
  duration: number
}
export type ToastFn = (toast: ToastInput) => number

/** Figma "NavItem" states. Hover and Focus come from CSS; Active marks the current page. */
export type NavItemState = 'default' | 'active' | 'disabled'
/** Figma "IconButton" states (same set as Button). */
export type IconButtonState = ButtonState
