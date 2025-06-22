export default function ContactPage() {
  return (
    <section>
      <h1 className="title font-semibold text-2xl tracking-tighter mb-8">Contact</h1>
      <p className="mb-8">
        I'd be happy to make your acquaintance and answer any questions you have. Use the form below and I&apos;ll get back to you as soon as I can.
      </p>

      <form
        action="https://usebasin.com/f/26f1a0ed87e5"
        method="POST"
        className="space-y-4"
      >
        <div className="flex flex-col">
          <label htmlFor="name" className="font-medium">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="border border-neutral-300 dark:border-neutral-700 rounded-md p-2 mt-1 bg-white dark:bg-neutral-900"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="email" className="font-medium">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="border border-neutral-300 dark:border-neutral-700 rounded-md p-2 mt-1 bg-white dark:bg-neutral-900"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="message" className="font-medium">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            required
            className="border border-neutral-300 dark:border-neutral-700 rounded-md p-2 mt-1 bg-white dark:bg-neutral-900"
          ></textarea>
        </div>
        <div>
          <button
            type="submit"
            className="bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black rounded-md px-4 py-2 hover:bg-neutral-700 dark:hover:bg-neutral-100"
          >
            Send Message
          </button>
        </div>
      </form>
    </section>
  );
} 