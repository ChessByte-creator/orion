import { createFileRoute } from "@tanstack/react-router";
import { TerminalApp } from "@/components/orion/TerminalApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TerminalApp />;
}
