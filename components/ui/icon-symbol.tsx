/*
This component serves as a wrapper around MaterialIcons,
allowing us to use logical names for icons that are consistent
across both Android and iOS platforms.
*/
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={name}
      style={style}
    />
  );
}
