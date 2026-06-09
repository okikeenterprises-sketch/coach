import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const createM = useMutation({
    mutationFn: async () => create({ data: {} }),
    onSuccess: (t) => navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true }),
  });

  // /chat with no thread: pick first or create one
  useEffect(() => {
    if (threadsQ.isLoading) return;
    const threads = threadsQ.data ?? [];
    if (threads.length > 0) {
      navigate({ to: "/chat/$threadId", params: { threadId: threads[0].id }, replace: true });
    } else if (!createM.isPending && !createM.isSuccess) {
      createM.mutate();
    }
  }, [threadsQ.isLoading, threadsQ.data, navigate, createM]);

  return <Outlet />;
}
