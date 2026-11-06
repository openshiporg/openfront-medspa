import type { Metadata } from "next"
import { storefrontMetadata } from "../lib/data/brand"
import { confirmGiftCardPurchase } from "../lib/data/giftCards"
import { PageIntro } from "../components/ui/PageIntro"
import { GiftCardPurchaseForm } from "../components/GiftCardPurchaseForm"
import { PillLink, StateCard, Track } from "../components/ui/primitives"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Gift cards")
}

type Search = { ref?: string; token?: string; purchase?: string }
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)

export async function GiftCardsPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const query: Search = searchParams ? await searchParams : {}
  const returned = query.ref && query.token ? await confirmGiftCardPurchase(query.ref, query.token) : null

  return (
    <div className="sf-container sf-page-pad">
      <PageIntro title="Gift cards">
        <p>Give a treatment, a facial or a little time off. Choose an amount and we email the code.</p>
      </PageIntro>
      {returned?.status === "paid" ? (
        <div className="mb-8">
          <StateCard title={`${money(returned.amount)} gift card purchased`} action={<Track><PillLink href="/services" variant="primary">Browse treatments</PillLink></Track>}>
            <p>Code <strong className="sf-num">{returned.code}</strong>. We emailed it to {returned.recipientEmail || "the recipient"}. Show the code at checkout to redeem it.</p>
          </StateCard>
        </div>
      ) : returned?.status === "pending" ? (
        <div className="mb-8"><StateCard title="Payment is still processing">
          <p>{query.purchase === "cancelled" ? "The payment was cancelled. You can try again below." : "We haven't received the payment yet. Reload in a moment; the card is emailed once it goes through."}</p>
        </StateCard></div>
      ) : returned?.status === "expired" || returned?.status === "review" ? (
        <div className="mb-8"><StateCard alert title={returned.status === "expired" ? "That payment page expired" : "We need to check this payment"}>
          <p>{returned.status === "expired" ? "No charge was made. Start again below." : "Contact the practice and we'll sort it out."}</p>
        </StateCard></div>
      ) : null}
      {returned?.status !== "paid" ? <GiftCardPurchaseForm /> : null}
    </div>
  )
}
