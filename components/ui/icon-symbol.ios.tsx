import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

// Extended list of SF Symbols for premium UI
export type IconSymbolName = 
  // Navigation
  | 'house.fill'
  | 'paperplane.fill'
  | 'person.fill'
  | 'person.crop.circle'
  | 'gearshape.fill'
  // Actions
  | 'chevron.left.forwardslash.chevron.right'
  | 'chevron.right'
  | 'chevron.left'
  | 'arrow.right'
  | 'arrow.left'
  | 'xmark'
  | 'checkmark'
  | 'plus'
  | 'minus'
  // Auth & User
  | 'lock.fill'
  | 'envelope.fill'
  | 'key.fill'
  | 'rectangle.portrait.and.arrow.right'
  | 'rectangle.portrait.and.arrow.forward'
  // Status & Info
  | 'bell.fill'
  | 'heart.fill'
  | 'star.fill'
  | 'bookmark.fill'
  | 'info.circle'
  | 'questionmark.circle'
  | 'exclamationmark.triangle'
  // Media & Content
  | 'photo.fill'
  | 'camera.fill'
  | 'doc.fill'
  | 'folder.fill'
  // Communication
  | 'message.fill'
  | 'phone.fill'
  | 'video.fill'
  // Misc
  | 'calendar'
  | 'clock.fill'
  | 'location.fill'
  | 'creditcard.fill'
  | 'shield.fill'
  | 'link'
  | 'square.and.arrow.up'
  | 'ellipsis'
  | 'ellipsis.vertical'
  | 'magnifyingglass'
  | 'trash'
  | 'pencil'
  | 'cube'
  | 'sparkles';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: IconSymbolName | SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name as SymbolViewProps['name']}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
