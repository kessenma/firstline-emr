// apps/web/app/messages/[id]/page.tsx
import {ChatThreadView} from "@/components/messages/ChatThreadView";
import { useGlobalContext } from "@/components/globalContext/GlobalContext";
export default async function ChatPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;

    if (!id) {
        return <div>Error: Chat ID not found</div>;
    }

    return (
        <div className="mt-24">
            <ChatThreadView id={decodeURIComponent(id)}/>
        </div>
    );
}
