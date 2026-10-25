import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// These surfaces read the signed-in teacher from context. Rendering them with a
// stubbed context keeps the assertions about structure, not about data loading.
vi.mock("../../src/features/guru/app-context", () => ({
  useTeacher: () => ({
    classes: [
      {
        id: "7b000000-0000-4000-8000-000000000001",
        label: "7B",
        grade: 7,
        count: 32,
        mode: "demo",
        revision: 1,
      },
    ],
    scope: { ownerId: "7b000000-0000-4000-8000-000000000001", mode: "demo" },
    state: { runs: [], collections: [], sample: true },
    offline: false,
    canMutate: true,
    refresh: async () => {},
  }),
}));

import { AssessmentsPage } from "../../src/features/guru/results";
import { ClassesPage } from "../../src/features/guru/classes";
import { TeacherHome } from "../../src/features/guru/home";
import { TabPanel, Tabs } from "../../src/ui/components/studio";

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(element);

describe("teacher surface structure", () => {
  it("tabs expose one tab stop, selection and the panel they control", () => {
    const html = render(
      createElement(Tabs, {
        label: "Tampilan asesmen dan hasil",
        panel: "asesmen",
        value: "hasil",
        options: [
          { id: "asesmen", label: "Asesmen" },
          { id: "hasil", label: "Hasil" },
        ],
        onChange: () => {},
      }),
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('id="asesmen-tab-hasil"');
    expect(html).toContain('aria-controls="asesmen-panel-hasil"');
    // The unselected tab leaves the tab order so arrows, not Tab, move selection.
    expect(html).toContain('tabindex="-1"');
  });

  it("an unselected panel leaves the accessibility tree", () => {
    const html = render(
      createElement(
        TabPanel,
        { panel: "asesmen", id: "asesmen", active: false },
        "isi",
      ),
    );
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="asesmen-tab-asesmen"');
    expect(html).toContain("hidden");
  });

  it("the results page splits asesmen/hasil and shows its filters outright", () => {
    const html = render(createElement(AssessmentsPage));
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Filter kegiatan");
    expect(html).toContain("Semua kelas");
    expect(html).toContain("Dari tanggal");
    expect(html).toContain("Sampai tanggal");
    // The collapsed disclosure hid every filter behind one summary line.
    expect(html).not.toContain("Cari berdasarkan kelas atau tanggal");
  });

  it("the home tools section is a card, not a bare disclosure", () => {
    const html = render(createElement(TeacherHome));
    expect(html).toContain("Soal &amp; alat");
    expect(html).toContain('class="teacher-disclosure"');
  });

  it("neither the home nor the class list claims a step it does not run", () => {
    for (const page of [
      createElement(TeacherHome),
      createElement(ClassesPage),
    ]) {
      const html = render(page);
      expect(html).not.toContain("studio-progress-label");
    }
  });
});
