export default function SubscribePage() {
  return (
    <section>
      <h1 className="title font-semibold text-2xl tracking-tighter mb-8">Subscribe</h1>
      <p className="mb-8">
        Join almost 3,000 subscribers via Substack to get notified about new posts. I write regularly about product, technology and productivity.
      </p>

      <iframe 
        src="https://ericdodds.substack.com/embed" 
        width="480" 
        height="150" 
        style={{ background: 'white' }}
        frameBorder="0" 
        scrolling="no"
        className="w-full max-w-[480px]"
      />
    </section>
  );
}
