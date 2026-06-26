#[cfg(target_os = "macos")]
mod platform {
  use objc2_app_kit::{NSColor, NSView, NSWindow};
  use tauri::WebviewWindow;

  fn apply_layer_mask(view: &NSView, radius: f64) {
    view.setWantsLayer(true);

    if let Some(layer) = view.layer() {
      layer.setCornerRadius(radius);
      layer.setMasksToBounds(true);
    }

    let subviews = view.subviews();
    let count = subviews.len();

    for index in 0..count {
      let subview = subviews.objectAtIndex(index as usize);
      apply_layer_mask(&subview, radius);
    }
  }

  pub fn shape_window(window: &WebviewWindow, radius: f64, circular: bool) {
    let raw = window
      .ns_window()
      .expect("failed to access NSWindow handle");
    let ns_window = unsafe { &*(raw as *const NSWindow) };

    let clear = NSColor::clearColor();
    ns_window.setOpaque(false);
    ns_window.setBackgroundColor(Some(&clear));
    ns_window.setHasShadow(!circular);

    if let Some(content_view) = ns_window.contentView() {
      apply_layer_mask(&content_view, radius);
    }
  }
}

#[cfg(not(target_os = "macos"))]
mod platform {
  use tauri::WebviewWindow;

  pub fn shape_window(_window: &WebviewWindow, _radius: f64, _circular: bool) {}
}

pub use platform::shape_window;
