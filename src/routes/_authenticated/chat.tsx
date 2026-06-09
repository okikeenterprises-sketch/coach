import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const threadsQ = useQuery({ queryKey: ["threads"], queryFn: () => list() });
  const handled = useRef(false);

  useEffect(() => {
    if (threadsQ.isLoading || handled.current) return;
    handled.current = true;
    const threads = threadsQ.data ?? [];
    if (threads.length > 0) {
      navigate({ to: "/chat/$threadId", params: { threadId: threads[0].id }, replace: true });
    } else {
      create({ data: {} }).then((t) => {
        navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
      });
    }
  }, [threadsQ.isLoading, threadsQ.data, navigate, create]);

  return <Outlet />;
}

