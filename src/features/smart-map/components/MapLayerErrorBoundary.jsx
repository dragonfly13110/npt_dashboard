import { Component } from 'react';

function resetChanged(previous, current) {
  if (Array.isArray(previous) && Array.isArray(current)) {
    return (
      previous.length !== current.length ||
      previous.some((value, index) => !Object.is(value, current[index]))
    );
  }

  return !Object.is(previous, current);
}

export default class MapLayerErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.failed &&
      resetChanged(previousProps.resetOn, this.props.resetOn)
    ) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        this.props.fallback ?? (
          <span role="status">ไม่สามารถแสดง{this.props.layerName}ได้</span>
        )
      );
    }

    return this.props.children;
  }
}
