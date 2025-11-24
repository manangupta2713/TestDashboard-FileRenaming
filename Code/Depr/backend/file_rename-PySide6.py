import os
import sys

from PySide6.QtCore import (
    Qt,
    QSize,
    QPropertyAnimation,
    QEasingCurve,
    QSequentialAnimationGroup,
    QParallelAnimationGroup,
    QPauseAnimation,
)
from PySide6.QtGui import QFont, QColor
from PySide6.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QFileDialog,
    QLineEdit,
    QFrame,
    QTableWidget,
    QTableWidgetItem,
    QHeaderView,
    QMessageBox,
    QToolButton,
    QSizePolicy,
    QGraphicsDropShadowEffect,
    QGraphicsOpacityEffect,
)

DELIMS = ['_', '-', '.', ',']


class StepButton(QToolButton):
    def __init__(self, text, parent=None):
        super().__init__(parent)
        self.setText(text)
        self.setCheckable(True)
        self.setAutoExclusive(False)
        self.setFixedSize(QSize(32, 32))
        self.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed)
        self.update_style()
        self.clicked.connect(self.update_style)

    def setChecked(self, checked: bool) -> None:
        super().setChecked(checked)
        self.update_style()

    def update_style(self):
        if self.isChecked():
            style = (
                "QToolButton {"
                "border-radius: 16px;"
                "border: 2px solid #00bcd4;"
                "background-color: #002b36;"
                "color: #e0f7fa;"
                "font-weight: bold;"
                "}"
                "QToolButton:hover {"
                "background-color: #004d60;"
                "}"
                "QToolButton:pressed {"
                "background-color: #006f80;"
                "}"
            )
        else:
            style = (
                "QToolButton {"
                "border-radius: 16px;"
                "border: 1px solid #555;"
                "background-color: #222;"
                "color: #ccc;"
                "}"
                "QToolButton:hover {"
                "background-color: #333;"
                "}"
                "QToolButton:pressed {"
                "background-color: #444;"
                "}"
            )
        self.setStyleSheet(style)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.folder_path = ""
        self.files_in_folder = []
        self.operation_rows = []
        self.step_buttons_matrix = []
        self.cards_for_animation = []
        self._animated_once = False
        self._card_animations = []
        self._run_glow_animation = None

        self.setWindowTitle("Smart Prefix/Suffix Renamer")
        self.resize(900, 650)
        self.setup_ui()
        self.apply_global_style()
        self.setup_shadows()
        self.setup_run_button_glow()

    # ---------- Styling ----------

    def apply_global_style(self):
        self.setStyleSheet(
            "QMainWindow { background-color: #0b0c10; }"
            "QLabel { color: #f0f0f0; }"
            "QLineEdit {"
            "  background-color: #15171d;"
            "  color: #f0f0f0;"
            "  border: 1px solid #2f323a;"
            "  border-radius: 6px;"
            "  padding: 4px 8px;"
            "}"
            "QLineEdit:focus {"
            "  border: 1px solid #00bcd4;"
            "}"
            "QPushButton {"
            "  background-color: #00bcd4;"
            "  border-radius: 8px;"
            "  padding: 8px 18px;"
            "  color: #000;"
            "  font-weight: 600;"
            "  letter-spacing: 0.3px;"
            "}"
            "QPushButton:hover {"
            "  background-color: #26c6da;"
            "}"
            "QPushButton:pressed {"
            "  background-color: #00acc1;"
            "}"
            "QPushButton:disabled {"
            "  background-color: #444;"
            "  color: #999;"
            "}"
            "QFrame#card {"
            "  background-color: #101219;"
            "  border-radius: 14px;"
            "  border: 1px solid #232632;"
            "}"
            "QTableWidget {"
            "  background-color: #13151d;"
            "  alternate-background-color: #191c25;"
            "  color: #f0f0f0;"
            "  gridline-color: #333;"
            "}"
            "QHeaderView::section {"
            "  background-color: #1b1e27;"
            "  color: #f0f0f0;"
            "  border: none;"
            "  padding: 4px;"
            "}"
        )

    def setup_shadows(self):
        # Add soft shadows to cards
        for card in self.cards_for_animation:
            shadow = QGraphicsDropShadowEffect(self)
            shadow.setBlurRadius(24)
            shadow.setXOffset(0)
            shadow.setYOffset(12)
            shadow.setColor(QColor(0, 0, 0, 180))
            card.setGraphicsEffect(shadow)

    def setup_run_button_glow(self):
        if not hasattr(self, "run_btn"):
            return
        glow = QGraphicsDropShadowEffect(self)
        glow.setBlurRadius(18)
        glow.setXOffset(0)
        glow.setYOffset(0)
        glow.setColor(QColor(0, 188, 212, 160))  # teal glow
        self.run_btn.setGraphicsEffect(glow)

        anim = QPropertyAnimation(glow, b"blurRadius", self)
        anim.setStartValue(10)
        anim.setEndValue(26)
        anim.setDuration(1200)
        anim.setEasingCurve(QEasingCurve.InOutQuad)
        anim.setLoopCount(-1)
        anim.start()
        self._run_glow_animation = anim

    # ---------- UI setup ----------

    def setup_ui(self):
        central = QWidget()
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(12)

        # Header
        header_lbl = QLabel("Smart Prefix/Suffix Renamer")
        sub_lbl = QLabel("Define a sequence of prefix/suffix operations and rename files safely.")
        header_font = QFont()
        header_font.setPointSize(16)
        header_font.setBold(True)
        header_lbl.setFont(header_font)
        sub_lbl.setStyleSheet("color: #aaaaaa;")
        main_layout.addWidget(header_lbl)
        main_layout.addWidget(sub_lbl)

        # Folder card
        self.folder_card = QFrame()
        self.folder_card.setObjectName("card")
        folder_layout = QHBoxLayout(self.folder_card)
        folder_layout.setContentsMargins(12, 12, 12, 12)

        self.folder_label = QLabel("No folder selected")
        self.folder_label.setStyleSheet("color: #bbbbbb;")
        self.file_count_label = QLabel("")
        self.file_count_label.setStyleSheet("color: #888888;")

        browse_btn = QPushButton("Choose Folder…")
        browse_btn.clicked.connect(self.choose_folder)

        left_box = QVBoxLayout()
        left_box.addWidget(self.folder_label)
        left_box.addWidget(self.file_count_label)

        folder_layout.addLayout(left_box)
        folder_layout.addStretch()
        folder_layout.addWidget(browse_btn)

        main_layout.addWidget(self.folder_card)

        # Operations card
        self.ops_card = QFrame()
        self.ops_card.setObjectName("card")
        ops_layout = QVBoxLayout(self.ops_card)
        ops_layout.setContentsMargins(12, 12, 12, 12)
        ops_layout.setSpacing(8)

        ops_title = QLabel("Operations & Order")
        ops_title.setStyleSheet("font-weight: 600;")
        ops_layout.addWidget(ops_title)

        hint = QLabel("Assign steps 1–4 to operations. Each step number can be used only once.")
        hint.setStyleSheet("color: #999999; font-size: 11px;")
        ops_layout.addWidget(hint)

        # header row
        header_row = QHBoxLayout()
        header_row.addSpacing(80)
        header_row.addWidget(QLabel("Operation"), 2)
        header_row.addWidget(QLabel("Value"), 3)
        header_row.addWidget(QLabel("Step"), 3)
        ops_layout.addLayout(header_row)

        op_defs = [
            ("add_prefix", "Add prefix"),
            ("remove_prefix", "Remove prefix"),
            ("add_suffix", "Add suffix"),
            ("remove_suffix", "Remove suffix"),
        ]

        for idx, (op_type, op_label_text) in enumerate(op_defs):
            row_frame = QFrame()
            row_layout = QHBoxLayout(row_frame)
            row_layout.setContentsMargins(4, 4, 4, 4)

            op_label = QLabel(op_label_text)

            value_edit = QLineEdit()
            value_edit.setPlaceholderText("Enter text…")

            # Step buttons 1–4
            step_buttons = []
            steps_layout = QHBoxLayout()
            steps_layout.setSpacing(6)
            for step_num in range(1, 5):
                btn = StepButton(str(step_num))
                btn.clicked.connect(self.make_step_click_handler(idx, step_num - 1))
                steps_layout.addWidget(btn)
                step_buttons.append(btn)

            self.step_buttons_matrix.append(step_buttons)

            row_layout.addSpacing(8)
            row_layout.addWidget(op_label, 2)
            row_layout.addWidget(value_edit, 3)
            row_layout.addLayout(steps_layout, 3)

            ops_layout.addWidget(row_frame)

            self.operation_rows.append(
                {
                    "type": op_type,
                    "line_edit": value_edit,
                    "step_buttons": step_buttons,
                }
            )

        main_layout.addWidget(self.ops_card)

        # Preview / Run card
        self.actions_card = QFrame()
        self.actions_card.setObjectName("card")
        actions_layout = QHBoxLayout(self.actions_card)
        actions_layout.setContentsMargins(12, 12, 12, 12)

        self.preview_btn = QPushButton("Preview")
        self.preview_btn.clicked.connect(self.show_preview)
        self.preview_btn.setEnabled(False)

        self.run_btn = QPushButton("Run")
        self.run_btn.clicked.connect(self.run_renaming)
        self.run_btn.setEnabled(False)

        actions_layout.addWidget(self.preview_btn)
        actions_layout.addWidget(self.run_btn)
        actions_layout.addStretch()

        main_layout.addWidget(self.actions_card)

        # Preview / log table
        self.table_card = QFrame()
        self.table_card.setObjectName("card")
        table_layout = QVBoxLayout(self.table_card)
        table_layout.setContentsMargins(12, 12, 12, 12)

        self.summary_label = QLabel("No preview yet.")
        self.summary_label.setStyleSheet("color: #aaaaaa;")
        table_layout.addWidget(self.summary_label)

        self.table = QTableWidget()
        self.table.setColumnCount(2)
        self.table.setHorizontalHeaderLabels(["Original name", "New name (preview)"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.table.setAlternatingRowColors(True)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        table_layout.addWidget(self.table)

        main_layout.addWidget(self.table_card)

        self.setCentralWidget(central)

        # Cards that will have entrance animation + shadow
        self.cards_for_animation = [
            self.folder_card,
            self.ops_card,
            self.actions_card,
            self.table_card,
        ]

    # ---------- Animated entrance ----------

    def showEvent(self, event):
        super().showEvent(event)
        if not self._animated_once:
            self.start_entrance_animation()
            self._animated_once = True

    def start_entrance_animation(self):
        # Fade-in + slight upward slide for all cards
        group = QParallelAnimationGroup(self)

        base_delay = 50
        delay_step = 80

        for idx, card in enumerate(self.cards_for_animation):
            # Opacity effect
            op_effect = QGraphicsOpacityEffect(card)
            card.setGraphicsEffect(op_effect)
            op_effect.setOpacity(0.0)

            fade = QPropertyAnimation(op_effect, b"opacity", self)
            fade.setStartValue(0.0)
            fade.setEndValue(1.0)
            fade.setDuration(400)
            fade.setEasingCurve(QEasingCurve.InOutQuad)

            # Geometry slide (from slightly lower)
            start_geo = card.geometry()
            offset_geo = start_geo.translated(0, 12)
            card.setGeometry(offset_geo)

            slide = QPropertyAnimation(card, b"geometry", self)
            slide.setStartValue(offset_geo)
            slide.setEndValue(start_geo)
            slide.setDuration(400)
            slide.setEasingCurve(QEasingCurve.OutCubic)

            # Sequenced with small stagger
            seq = QSequentialAnimationGroup(self)
            seq.addAnimation(QPauseAnimation(base_delay + idx * delay_step, self))
            par = QParallelAnimationGroup(self)
            par.addAnimation(fade)
            par.addAnimation(slide)
            seq.addAnimation(par)

            group.addAnimation(seq)
            self._card_animations.append((op_effect, fade, slide, seq))

        group.start()

    # ---------- Step button logic ----------

    def make_step_click_handler(self, row_index, step_index):
        def handler():
            btn = self.step_buttons_matrix[row_index][step_index]
            if btn.isChecked():
                # Just turned on → enforce uniqueness
                self.clear_step_from_other_rows(step_index, except_row=row_index)
                self.clear_other_steps_in_row(row_index, except_step=step_index)
                btn.setChecked(True)
            else:
                btn.setChecked(False)

            self.update_action_buttons_enabled()

        return handler

    def clear_step_from_other_rows(self, step_index, except_row=None):
        for r, row_buttons in enumerate(self.step_buttons_matrix):
            if r == except_row:
                continue
            btn = row_buttons[step_index]
            if btn.isChecked():
                btn.setChecked(False)

    def clear_other_steps_in_row(self, row_index, except_step=None):
        for s, btn in enumerate(self.step_buttons_matrix[row_index]):
            if s == except_step:
                continue
            if btn.isChecked():
                btn.setChecked(False)

    # ---------- Folder selection ----------

    def choose_folder(self):
        path = QFileDialog.getExistingDirectory(self, "Select folder")
        if not path:
            return
        self.folder_path = path
        self.files_in_folder = sorted(
            [
                f
                for f in os.listdir(self.folder_path)
                if os.path.isfile(os.path.join(self.folder_path, f))
            ]
        )
        self.folder_label.setText(self.folder_path)
        self.file_count_label.setText(f"{len(self.files_in_folder)} files found (non-recursive).")
        self.update_action_buttons_enabled()

    def update_action_buttons_enabled(self):
        has_folder = bool(self.folder_path) and bool(self.files_in_folder)
        has_ops = bool(self.collect_operations())
        enable = has_folder and has_ops
        self.preview_btn.setEnabled(enable)
        self.run_btn.setEnabled(enable)

    # ---------- Collect operations ----------

    def collect_operations(self):
        ops = []
        for row in self.operation_rows:
            text = row["line_edit"].text()
            step_index = None
            for i, btn in enumerate(row["step_buttons"]):
                if btn.isChecked():
                    step_index = i
                    break
            if step_index is None:
                continue
            if not text:
                continue
            ops.append(
                {
                    "step": step_index + 1,  # 1–4
                    "type": row["type"],
                    "value": text,
                }
            )
        ops.sort(key=lambda o: o["step"])
        return ops

    # ---------- Preview ----------

    def show_preview(self):
        if not self.folder_path or not self.files_in_folder:
            return
        ops = self.collect_operations()
        if not ops:
            QMessageBox.information(self, "No operations", "Please configure at least one operation.")
            return

        mapping, summary = self.compute_new_names(ops)

        self.summary_label.setText(
            f"Preview only · {summary['renamed']} files would be renamed · "
            f"{summary['unchanged']} unchanged · "
            f"{summary['collisions']} collision adjustments."
        )

        self.table.setRowCount(len(mapping))
        for row_index, (old_name, new_name) in enumerate(mapping.items()):
            self.table.setItem(row_index, 0, QTableWidgetItem(old_name))
            self.table.setItem(row_index, 1, QTableWidgetItem(new_name))

    # ---------- Run ----------

    def run_renaming(self):
        if not self.folder_path or not self.files_in_folder:
            return
        ops = self.collect_operations()
        if not ops:
            QMessageBox.information(self, "No operations", "Please configure at least one operation.")
            return

        mapping, summary = self.compute_new_names(ops)

        reply = QMessageBox.question(
            self,
            "Confirm rename",
            f"This will rename {summary['renamed']} files.\n"
            f"{summary['unchanged']} unchanged.\n"
            f"{summary['collisions']} collision adjustments will be applied.\n\n"
            "Proceed?",
        )
        if reply != QMessageBox.Yes:
            return

        errors = []
        for old_name, new_name in mapping.items():
            if old_name == new_name:
                continue
            src = os.path.join(self.folder_path, old_name)
            dst = os.path.join(self.folder_path, new_name)
            try:
                os.rename(src, dst)
            except OSError as e:
                errors.append((old_name, new_name, str(e)))

        msg = (
            f"Renaming completed.\n\n"
            f"Renamed: {summary['renamed']} files\n"
            f"Unchanged: {summary['unchanged']} files\n"
            f"Collision-adjusted: {summary['collisions']} names\n"
        )
        if errors:
            msg += f"\nErrors on {len(errors)} files (they were skipped)."

        QMessageBox.information(self, "Done", msg)

        # Refresh file list and preview
        self.files_in_folder = sorted(
            [
                f
                for f in os.listdir(self.folder_path)
                if os.path.isfile(os.path.join(self.folder_path, f))
            ]
        )
        self.show_preview()

    # ---------- Core renaming logic ----------

    def compute_new_names(self, ops):
        existing_names = set(self.files_in_folder)
        mapping = {}
        used_targets = set()
        renamed_count = 0
        collision_count = 0

        for fname in self.files_in_folder:
            base, ext = os.path.splitext(fname)
            for op in ops:
                op_type = op["type"]
                value = op["value"]
                if op_type == "add_prefix":
                    base = self.apply_add_prefix(base, value)
                elif op_type == "remove_prefix":
                    base = self.apply_remove_prefix(base, value)
                elif op_type == "add_suffix":
                    base = self.apply_add_suffix(base, value)
                elif op_type == "remove_suffix":
                    base = self.apply_remove_suffix(base, value)
            candidate = base + ext

            final_name = candidate
            if final_name != fname:
                if (
                    final_name in used_targets
                    or (final_name in existing_names and final_name != fname)
                ):
                    collision_count += 1
                    root, ex = os.path.splitext(candidate)
                    counter = 1
                    new_candidate = f"{root}_{counter}{ex}"
                    while (
                        new_candidate in used_targets
                        or (new_candidate in existing_names and new_candidate != fname)
                    ):
                        counter += 1
                        new_candidate = f"{root}_{counter}{ex}"
                    final_name = new_candidate

            if final_name != fname:
                renamed_count += 1
            used_targets.add(final_name)
            mapping[fname] = final_name

        unchanged_count = len(self.files_in_folder) - renamed_count

        summary = {
            "renamed": renamed_count,
            "unchanged": unchanged_count,
            "collisions": collision_count,
        }
        return mapping, summary

    # ---------- Individual operations ----------

    def apply_add_prefix(self, base, prefix):
        if not prefix:
            return base
        if prefix[-1] in DELIMS:
            return prefix + base
        return prefix + "-" + base

    def apply_remove_prefix(self, base, prefix):
        if not prefix:
            return base
        if base.startswith(prefix):
            new_base = base[len(prefix):]
            if new_base and new_base[0] in DELIMS:
                new_base = new_base[1:]
            return new_base
        return base

    def apply_add_suffix(self, base, suffix):
        if not suffix:
            return base
        if suffix[0] in DELIMS:
            return base + suffix
        return base + "-" + suffix

    def apply_remove_suffix(self, base, suffix):
        if not suffix:
            return base
        if base.endswith(suffix):
            new_base = base[:-len(suffix)]
            if new_base and new_base[-1] in DELIMS:
                new_base = new_base[:-1]
            return new_base
        return base


def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
