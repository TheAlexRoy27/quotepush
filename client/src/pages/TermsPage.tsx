import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  const effectiveDate = "April 15, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back nav */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to QuotePush.io
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Effective Date: {effectiveDate}</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using QuotePush.io ("the Service," "we," "us," or "our"), you agree to be bound by
              these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
              These Terms apply to all users, including individuals, businesses, and organizations that access
              the Service in any capacity.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              QuotePush.io is a lead outreach and SMS automation platform that enables businesses to manage
              leads, send automated text message campaigns, and track engagement. The Service includes web-based
              tools for importing leads, building drip sequences, managing templates, and analyzing campaign
              performance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. SMS Messaging and TCPA Compliance</h2>
            <p className="mb-3">
              You are solely responsible for ensuring that all SMS messages sent through the Service comply with
              the Telephone Consumer Protection Act (TCPA), the CAN-SPAM Act, applicable state laws, and carrier
              guidelines. By using the Service to send SMS messages, you represent and warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You have obtained prior express written consent from each recipient before sending marketing messages.</li>
              <li>You maintain verifiable records of consent, including the method, date, and time consent was obtained.</li>
              <li>All messages include a clear opt-out mechanism (e.g., "Reply STOP to unsubscribe").</li>
              <li>You will honor opt-out requests promptly and permanently.</li>
              <li>You will not send messages to numbers on the National Do Not Call Registry without express consent.</li>
            </ul>
            <p className="mt-3">
              QuotePush.io reserves the right to suspend or terminate accounts that violate messaging laws or
              carrier acceptable use policies without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. User Accounts</h2>
            <p>
              You must create an account to use the Service. You are responsible for maintaining the
              confidentiality of your account credentials and for all activities that occur under your account.
              You agree to notify us immediately of any unauthorized use of your account. We reserve the right
              to terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Prohibited Uses</h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Send unsolicited commercial messages (spam) to any person.</li>
              <li>Violate any applicable federal, state, or local law or regulation.</li>
              <li>Transmit any content that is unlawful, harassing, defamatory, abusive, or fraudulent.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Attempt to gain unauthorized access to any portion of the Service or its related systems.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Fees and Payment</h2>
            <p>
              Certain features of the Service require a paid subscription. All fees are stated in U.S. dollars
              and are non-refundable except as expressly set forth in these Terms or required by applicable law.
              We reserve the right to change our pricing at any time with reasonable notice. Continued use of
              the Service after a price change constitutes your acceptance of the new pricing.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service — including but not limited to software,
              text, graphics, logos, and icons — are the exclusive property of QuotePush.io and are protected
              by applicable intellectual property laws. You may not reproduce, distribute, modify, or create
              derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
              OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF
              VIRUSES OR OTHER HARMFUL COMPONENTS. YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUOTEPUSH.IO SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE
              OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL
              LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless QuotePush.io and its officers, directors,
              employees, and agents from and against any claims, liabilities, damages, losses, and expenses
              (including reasonable attorneys' fees) arising out of or in any way connected with your use of
              the Service, your violation of these Terms, or your violation of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Texas,
              without regard to its conflict of law provisions. Any disputes arising under these Terms shall be
              resolved exclusively in the state or federal courts located in Texas.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of material changes
              by updating the effective date at the top of this page. Your continued use of the Service after
              any changes constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">13. Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us at{" "}
              <a href="mailto:support@quotepush.io" className="text-indigo-400 hover:text-indigo-300 underline">
                support@quotepush.io
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} QuotePush.io. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
