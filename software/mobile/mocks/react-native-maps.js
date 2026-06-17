import React from 'react';
import { View, Text } from 'react-native';

export const PROVIDER_DEFAULT = 'default';

export class Marker extends React.Component {
  render() {
    return null;
  }
}

export class Polyline extends React.Component {
  render() {
    return null;
  }
}

export default class MapView extends React.Component {
  render() {
    return (
      <View style={[this.props.style, { backgroundColor: '#e8f4f8', justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Map (Web Mock)</Text>
      </View>
    );
  }
}
