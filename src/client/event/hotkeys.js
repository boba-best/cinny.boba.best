import { openSearch, toggleRoomSettings } from '../action/navigation';
import navigation from '../state/navigation';

function listenKeyboard(event) {
  // Ctrl +
  if (event.ctrlKey) {
    // k - for search Modal
    if (event.keyCode === 75) {
      event.preventDefault();
      if (navigation.isRawModalVisible) return;
      openSearch();
    }
  }

  if (!event.ctrlKey && !event.altKey) {
    if (navigation.isRawModalVisible) return;
    if (['text', 'textarea'].includes(document.activeElement.type)) {
      return;
    }

    // esc - close room settings panel
    if (event.keyCode === 27 && navigation.isRoomSettings) {
      toggleRoomSettings();
    }

    if ((event.keyCode !== 8 && event.keyCode < 48)
      || (event.keyCode >= 91 && event.keyCode <= 93)
      || (event.keyCode >= 112 && event.keyCode <= 183)) {
      return;
    }

    // press any key to focus and type in message field
    const msgTextarea = document.getElementById('message-textarea');
    msgTextarea?.focus();
  }
}

function initHotkeys() {
  document.body.addEventListener('keydown', listenKeyboard);
}

function removeHotkeys() {
  document.body.removeEventListener('keydown', listenKeyboard);
}

export { initHotkeys, removeHotkeys };
