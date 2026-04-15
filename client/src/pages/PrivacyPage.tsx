import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Effective Date: {effectiveDate}</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              QuotePush.io ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our lead
              outreach and SMS automation platform. Please read this policy carefully. If you disagree with its
              terms, please discontinue use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information in the following ways:</p>
            <p className="font-medium text-foreground mb-1">Information you provide directly:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Account registration data: name, email address, phone number, organization name</li>
              <li>Lead data you import or enter: names, phone numbers, email addresses, company names</li>
              <li>Message content you create in templates and drip sequences</li>
              <li>Consent proof URLs you attach to lead records</li>
              <li>Payment information (processed securely by Stripe we do not store card details)</li>
            </ul>
            <p className="font-medium text-foreground mb-1">Information collected automatically:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Log data: IP address, browser type, pages visited, timestamps</li>
              <li>Device information: operating system, device identifiers</li>
              <li>Usage data: features used, campaign performance metrics, reply rates</li>
              <li>Consent timestamps: the date and time you accepted our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process transactions and send related information (receipts, invoices)</li>
              <li>Send administrative messages, technical notices, and support responses</li>
              <li>Analyze usage patterns to improve the Service</li>
              <li>Comply with legal obligations, including TCPA and carrier requirements</li>
              <li>Detect, prevent, and address fraud or security incidents</li>
              <li>Respond to legal requests and prevent harm</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. SMS Data and Messaging</h2>
            <p className="mb-3">
              As an SMS platform, we handle phone numbers and message content on your behalf. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Lead phone numbers</strong> are stored securely and used
                solely to deliver messages you authorize through the Service.
              </li>
              <li>
                <strong className="text-foreground">Message content</strong> (templates, drip sequences) is
                stored to enable campaign delivery and is not shared with third parties except as required to
                route messages through our SMS provider (Twilio).
              </li>
              <li>
                <strong className="text-foreground">Opt-out requests</strong> (STOP replies) are recorded and
                honored. We will not send further messages to opted-out numbers.
              </li>
              <li>
                <strong className="text-foreground">Consent records</strong> including timestamps and proof
                URLs are stored to support your compliance obligations under the TCPA.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell, rent, or share lead phone numbers or message content with third parties for their
              own marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Sharing of Information</h2>
            <p className="mb-3">We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Service providers</strong> who assist in operating the
                platform (e.g., Twilio for SMS delivery, Stripe for payments, cloud infrastructure providers).
                These parties are contractually obligated to protect your data.
              </li>
              <li>
                <strong className="text-foreground">Legal authorities</strong> when required by law, subpoena,
                or to protect the rights, property, or safety of QuotePush.io, our users, or the public.
              </li>
              <li>
                <strong className="text-foreground">Business transfers</strong> in connection with a merger,
                acquisition, or sale of assets, with notice provided to affected users.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Data Retention</h2>
            <p>
              We retain your account data and lead records for as long as your account is active or as needed
              to provide the Service. You may request deletion of your account and associated data at any time
              by contacting us at{" "}
              <a href="mailto:support@quotepush.io" className="text-indigo-400 hover:text-indigo-300 underline">
                support@quotepush.io
              </a>. We may retain certain data as required by law or for legitimate business purposes (e.g.,
              fraud prevention, legal compliance).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including encryption
              in transit (TLS), encrypted storage of sensitive credentials, and access controls. However, no
              method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee
              absolute security and encourage you to use strong, unique passwords for your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict certain processing of your data</li>
              <li>Data portability (receive your data in a structured, machine-readable format)</li>
              <li>Withdraw consent at any time (where processing is based on consent)</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@quotepush.io" className="text-indigo-400 hover:text-indigo-300 underline">
                support@quotepush.io
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Cookies</h2>
            <p>
              We use session cookies to maintain your authenticated state while using the Service. We do not
              use third-party advertising cookies or tracking pixels. You may disable cookies in your browser
              settings, but doing so may prevent you from using certain features of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">10. Children's Privacy</h2>
            <p>
              The Service is not directed to individuals under the age of 18. We do not knowingly collect
              personal information from children. If you believe we have inadvertently collected information
              from a child, please contact us immediately and we will take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by
              updating the effective date at the top of this page. Your continued use of the Service after
              changes are posted constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">12. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices, please contact
              us at{" "}
              <a href="mailto:support@quotepush.io" className="text-indigo-400 hover:text-indigo-300 underline">
                support@quotepush.io
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} QuotePush.io. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
