export default function AboutHero() {
  return (
    <section className="about-hero">

      <div className="about-text">

        <h1>Sobre Altavera</h1>

        <p>
          Somos una empresa costarricense dedicada a seleccionar
          los mejores productos frescos del campo para llevarlos
          directamente hasta su hogar.
        </p>

      </div>

      <div className="about-image">

        <div className="blob blob-green"></div>

        <img
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=900"
          alt="Altavera"
        />

        <div className="blob blob-orange"></div>

      </div>

    </section>
  );
}