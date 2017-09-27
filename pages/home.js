import './styles/home.css';

/* please notice that these two parameters should always be there */
export default function Home(Tag, Zino) {
	//Zino.import('my-sub-component.js');

	return {
		tagName: 'home',
		render(data) {
			return (
				<div class="home">
					<h1>Welcome!</h1>
					<p>This is the starting point for building fantastic Zino apps.</p>
				</div>
			);
		}
	};
}
