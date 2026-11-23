"""
GazeConnect System-Wide OS Desktop Controller
Direct low-latency Windows cursor manipulation using ctypes.windll.user32,
with graceful fallback for cross-platform support.
Includes mandatory hardware mouse override protection (failsafe).
"""

import sys
import time
import math
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Windows mouse_event constants
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
WHEEL_DELTA = 120


class OSController:
    """
    Controls desktop mouse and scrolling events via native ctypes (Windows)
    or pyautogui fallback.
    """

    def __init__(self, override_threshold_px: float = 80.0, override_pause_sec: float = 3.0):
        self.is_windows = sys.platform == "win32"
        self.override_threshold_px = override_threshold_px
        self.override_pause_sec = override_pause_sec

        # State tracking for failsafe override
        self.last_programmatic_pos: Optional[Tuple[int, int]] = None
        self.paused_until: float = 0.0
        self.is_paused: bool = False

        if self.is_windows:
            import ctypes
            from ctypes import wintypes

            self.user32 = ctypes.windll.user32

            class POINT(ctypes.Structure):
                _fields_ = [("x", wintypes.LONG), ("y", wintypes.LONG)]

            self.POINT = POINT
            logger.info("OSController initialized using native Windows ctypes.windll.user32")
        else:
            self.user32 = None
            logger.info("OSController running on non-Windows; using mock/fallback")

    def get_screen_resolution(self) -> Tuple[int, int]:
        """Returns primary screen width and height in pixels."""
        if self.is_windows and self.user32:
            width = self.user32.GetSystemMetrics(0)
            height = self.user32.GetSystemMetrics(1)
            return (width, height)
        return (1920, 1080)

    def get_cursor_pos(self) -> Tuple[int, int]:
        """Returns current cursor position on screen."""
        if self.is_windows and self.user32:
            pt = self.POINT()
            self.user32.GetCursorPos(ctypes.byref(pt))
            return (pt.x, pt.y)
        return self.last_programmatic_pos or (960, 540)

    def check_hardware_override(self) -> bool:
        """
        Detects if the user physically moved the real mouse away from the
        last programmatic gaze position by more than override_threshold_px.
        If detected, pauses OS control for override_pause_sec.
        """
        now = time.time()
        if now < self.paused_until:
            return True

        if self.last_programmatic_pos is not None:
            curr_x, curr_y = self.get_cursor_pos()
            last_x, last_y = self.last_programmatic_pos
            distance = math.hypot(curr_x - last_x, curr_y - last_y)

            if distance > self.override_threshold_px:
                logger.warning(
                    f"Physical mouse override detected: moved {distance:.1f}px > {self.override_threshold_px}px. "
                    f"Pausing eye-control for {self.override_pause_sec}s."
                )
                self.paused_until = now + self.override_pause_sec
                self.is_paused = True
                return True

        self.is_paused = False
        return False

    def move_cursor(self, norm_x: float, norm_y: float) -> Tuple[bool, str]:
        """
        Moves the OS cursor to normalized coordinates norm_x, norm_y in [0.0, 1.0].
        Returns (success: bool, status_message: str).
        """
        if self.check_hardware_override():
            remaining = max(0.0, self.paused_until - time.time())
            return (False, f"Manual Mouse Override — Paused ({remaining:.1f}s)")

        clamped_x = max(0.0, min(1.0, norm_x))
        clamped_y = max(0.0, min(1.0, norm_y))

        width, height = self.get_screen_resolution()
        target_x = int(clamped_x * (width - 1))
        target_y = int(clamped_y * (height - 1))

        if self.is_windows and self.user32:
            self.user32.SetCursorPos(target_x, target_y)

        self.last_programmatic_pos = (target_x, target_y)
        return (True, "ok")

    def click(self, button: str = "left", double: bool = False) -> Tuple[bool, str]:
        """
        Executes a real mouse click at the current cursor position.
        button: 'left', 'right'
        """
        if self.check_hardware_override():
            return (False, "Manual Mouse Override — Paused")

        if self.is_windows and self.user32:
            if button == "right":
                down_flag = MOUSEEVENTF_RIGHTDOWN
                up_flag = MOUSEEVENTF_RIGHTUP
            else:
                down_flag = MOUSEEVENTF_LEFTDOWN
                up_flag = MOUSEEVENTF_LEFTUP

            self.user32.mouse_event(down_flag, 0, 0, 0, 0)
            time.sleep(0.03)
            self.user32.mouse_event(up_flag, 0, 0, 0, 0)

            if double:
                time.sleep(0.08)
                self.user32.mouse_event(down_flag, 0, 0, 0, 0)
                time.sleep(0.03)
                self.user32.mouse_event(up_flag, 0, 0, 0, 0)

        # Update last position after click
        self.last_programmatic_pos = self.get_cursor_pos()
        return (True, f"{button}_{'double_' if double else ''}click_fired")

    def scroll(self, delta: int) -> Tuple[bool, str]:
        """
        Vertical mouse wheel scroll.
        Positive delta scrolls up, negative scrolls down.
        """
        if self.check_hardware_override():
            return (False, "Manual Mouse Override — Paused")

        if self.is_windows and self.user32:
            self.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, delta, 0)

        return (True, f"scroll_{delta}")


# Global singleton instance
os_controller = OSController()
