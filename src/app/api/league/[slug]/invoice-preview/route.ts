import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/components'
import BuyInInvoice, { buyInInvoiceSubject } from '../../../../../../emails/BuyInInvoice'
import { loadInvoiceOwed, type InvoiceCandidate } from '@/lib/invoiceOwed'

export const dynamic = 'force-dynamic'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

export type InvoicePreviewListResponse = {
  ok: true
  previewOnly: true
  leagueName: string
  seasonYear: number
  weeklyBuyIn: number
  seasonBuyIn: number
  paidCount: number
  activeMemberCount: number
  invoices: InvoiceCandidate[]
  coveredByWins: InvoiceCandidate[]
}

export type InvoicePreviewHtmlResponse = {
  ok: true
  previewOnly: true
  subject: string
  html: string
  invoice: InvoiceCandidate
}

export type InvoicePreviewErrorResponse = { ok: false; error: string }

/**
 * Preview-only buy-in invoice emails.
 * GET → roster of who would be invoiced (amountDue > 0).
 * GET ?memberId=… → rendered HTML for that member (never sends).
 *
 * There is intentionally no send path on this route.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!isAdmin(authCookie?.value)) {
    return NextResponse.json<InvoicePreviewErrorResponse>(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let supabase
  try {
    supabase = createServiceClient()
  } catch {
    return NextResponse.json<InvoicePreviewErrorResponse>(
      {
        ok: false,
        error:
          'Supabase credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 503 }
    )
  }

  let result
  try {
    result = await loadInvoiceOwed(supabase, slug)
  } catch (err) {
    return NextResponse.json<InvoicePreviewErrorResponse>(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to load invoice data' },
      { status: 500 }
    )
  }

  if (!result) {
    return NextResponse.json<InvoicePreviewErrorResponse>(
      { ok: false, error: 'League not found' },
      { status: 404 }
    )
  }

  const memberId = req.nextUrl.searchParams.get('memberId')
  const commissionerNote = req.nextUrl.searchParams.get('note')

  if (memberId) {
    const invoice =
      result.invoices.find((i) => i.memberId === memberId) ??
      result.coveredByWins.find((i) => i.memberId === memberId)

    if (!invoice) {
      return NextResponse.json<InvoicePreviewErrorResponse>(
        { ok: false, error: 'Member not on invoice list (paid in full or unknown id)' },
        { status: 404 }
      )
    }

    if (invoice.amountDue <= 0) {
      return NextResponse.json<InvoicePreviewErrorResponse>(
        {
          ok: false,
          error: 'No amount due — wins already cover buy-in. Invoice not generated.',
        },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://13runleague.com'
    const html = await render(
      BuyInInvoice({
        memberName: invoice.memberName,
        leagueName: result.leagueName,
        seasonYear: result.seasonYear,
        seasonBuyIn: invoice.seasonBuyIn,
        buyInOwed: invoice.buyInOwed,
        seasonWins: invoice.seasonWins,
        amountDue: invoice.amountDue,
        paymentStatus: invoice.paymentStatus,
        team: invoice.team,
        winWeeks: invoice.winWeeks,
        leagueUrl: `${appUrl}/league/${slug}`,
        commissionerNote,
      })
    )

    const body: InvoicePreviewHtmlResponse = {
      ok: true,
      previewOnly: true,
      subject: buyInInvoiceSubject(result.seasonYear, invoice.amountDue),
      html,
      invoice,
    }
    return NextResponse.json(body)
  }

  const body: InvoicePreviewListResponse = {
    ok: true,
    previewOnly: true,
    leagueName: result.leagueName,
    seasonYear: result.seasonYear,
    weeklyBuyIn: result.weeklyBuyIn,
    seasonBuyIn: result.seasonBuyIn,
    paidCount: result.paidCount,
    activeMemberCount: result.activeMemberCount,
    invoices: result.invoices,
    coveredByWins: result.coveredByWins,
  }
  return NextResponse.json(body)
}

/** Reject any attempt to POST/send — preview only. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await params
  return NextResponse.json<InvoicePreviewErrorResponse>(
    {
      ok: false,
      error:
        'Invoice emails are preview-only. There is no send endpoint. Commissioner reviews copy, then Colby sends manually after approving every word.',
    },
    { status: 405 }
  )
}
