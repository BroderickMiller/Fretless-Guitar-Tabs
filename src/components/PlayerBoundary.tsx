import { Component, type ReactNode } from "react";
export default class PlayerBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section>
        <p role="alert" className="notice error">
          The score player could not open. Your saved file is still in your
          library.
        </p>
        <button className="primary" onClick={this.props.onClose}>
          Return to library
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
