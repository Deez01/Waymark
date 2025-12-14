// Fallback for using MaterialIcons on Android and web.

import { Feather } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type FeatherIconName = ComponentProps<typeof Feather>['name'];

type IconMapping = Record<string, { type: 'material' | 'feather'; name: string }>;

/**
 * SF Symbols to Material Icons / Feather Icons mappings.
 * Using Feather icons for a more premium, minimalist look.
 */
const MAPPING: IconMapping = {
  // Navigation
  'house.fill': { type: 'feather', name: 'home' },
  'paperplane.fill': { type: 'feather', name: 'compass' },
  'person.fill': { type: 'feather', name: 'user' },
  'person.crop.circle': { type: 'feather', name: 'user' },
  'gearshape.fill': { type: 'feather', name: 'settings' },
  
  // Actions
  'chevron.left.forwardslash.chevron.right': { type: 'feather', name: 'code' },
  'chevron.right': { type: 'feather', name: 'chevron-right' },
  'chevron.left': { type: 'feather', name: 'chevron-left' },
  'arrow.right': { type: 'feather', name: 'arrow-right' },
  'arrow.left': { type: 'feather', name: 'arrow-left' },
  'xmark': { type: 'feather', name: 'x' },
  'checkmark': { type: 'feather', name: 'check' },
  'plus': { type: 'feather', name: 'plus' },
  'minus': { type: 'feather', name: 'minus' },
  
  // Auth & User
  'lock.fill': { type: 'feather', name: 'lock' },
  'envelope.fill': { type: 'feather', name: 'mail' },
  'key.fill': { type: 'feather', name: 'key' },
  'rectangle.portrait.and.arrow.right': { type: 'feather', name: 'log-out' },
  'rectangle.portrait.and.arrow.forward': { type: 'feather', name: 'log-in' },
  
  // Status & Info
  'bell.fill': { type: 'feather', name: 'bell' },
  'heart.fill': { type: 'feather', name: 'heart' },
  'star.fill': { type: 'feather', name: 'star' },
  'bookmark.fill': { type: 'feather', name: 'bookmark' },
  'info.circle': { type: 'feather', name: 'info' },
  'questionmark.circle': { type: 'feather', name: 'help-circle' },
  'exclamationmark.triangle': { type: 'feather', name: 'alert-triangle' },
  
  // Media & Content
  'photo.fill': { type: 'feather', name: 'image' },
  'camera.fill': { type: 'feather', name: 'camera' },
  'doc.fill': { type: 'feather', name: 'file-text' },
  'folder.fill': { type: 'feather', name: 'folder' },
  
  // Communication
  'message.fill': { type: 'feather', name: 'message-circle' },
  'phone.fill': { type: 'feather', name: 'phone' },
  'video.fill': { type: 'feather', name: 'video' },
  
  // Misc
  'calendar': { type: 'feather', name: 'calendar' },
  'clock.fill': { type: 'feather', name: 'clock' },
  'location.fill': { type: 'feather', name: 'map-pin' },
  'creditcard.fill': { type: 'feather', name: 'credit-card' },
  'shield.fill': { type: 'feather', name: 'shield' },
  'link': { type: 'feather', name: 'link' },
  'square.and.arrow.up': { type: 'feather', name: 'share' },
  'ellipsis': { type: 'feather', name: 'more-horizontal' },
  'ellipsis.vertical': { type: 'feather', name: 'more-vertical' },
  'magnifyingglass': { type: 'feather', name: 'search' },
  'trash': { type: 'feather', name: 'trash-2' },
  'pencil': { type: 'feather', name: 'edit-2' },
  'cube': { type: 'feather', name: 'box' },
  'sparkles': { type: 'feather', name: 'zap' },
};

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Feather/Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName | string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mapping = MAPPING[name as keyof typeof MAPPING];
  
  if (!mapping) {
    // Fallback to MaterialIcons if no mapping found
    return <MaterialIcons color={color} size={size} name="help-outline" style={style} />;
  }
  
  if (mapping.type === 'feather') {
    return (
      <Feather
        color={color as string}
        size={size}
        name={mapping.name as FeatherIconName}
        style={style}
      />
    );
  }
  
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={mapping.name as MaterialIconName}
      style={style}
    />
  );
}
