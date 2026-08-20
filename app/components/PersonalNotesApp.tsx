"use client";

import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { SECTION_TOKENS, tokenStyle, type SectionKey } from "../config/sections";
import { ArchivosModule } from "../modules/ArchivosModule";
import { FinanzasModule } from "../modules/FinanzasModule";
import { HomeView } from "../modules/HomeView";
import { MiDiaModule } from "../modules/MiDiaModule";
import { NotasModule } from "../modules/NotasModule";

export function PersonalNotesApp() {
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");

  useEffect(() => {
    const tokens = SECTION_TOKENS[activeSection];
    document.documentElement.style.setProperty("--page-accent", tokens.accent);
    document.documentElement.style.setProperty("--page-shadow", tokens.shadow);
  }, [activeSection]);

  const renderSection = () => {
    switch (activeSection) {
      case "day": return <MiDiaModule />;
      case "finances": return <FinanzasModule />;
      case "files": return <ArchivosModule />;
      case "notes": return <NotasModule />;
      default: return <HomeView onNavigate={setActiveSection} />;
    }
  };

  return <AppShell activeSection={activeSection} onNavigate={setActiveSection} style={tokenStyle(activeSection)}>{renderSection()}</AppShell>;
}
