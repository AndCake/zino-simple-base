import './styles/home.css';

export default function Home(Tag, Zino) {
	Tag;
	return {
		render(data) {
			return (
				<div class="home">
					<h1>Welcome!</h1>
					<p>If you can see this text, then the zino base component code is running on your server-{data.props.addition}side.</p>
				</div>
			);
		},
		functions: {
			props: {
				addition: ''
			},
			mount() {
				if (Zino.isBrowser) {
					setTimeout(() => {
						this.getHost().setProps('addition', ' and client-');
					}, 50);
				}
			}
		}
	};
}