import { Component } from 'react';

export default class MapLayerErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetOn !== this.props.resetOn) {
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
