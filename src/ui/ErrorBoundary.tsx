// Bọc NGOÀI <Suspense>, chỉ quanh phần biểu đồ: chunk hỏng thì tiêu đề, ô số, bảng vẫn còn.
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
