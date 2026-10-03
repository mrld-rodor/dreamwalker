from flask import Flask, render_template


app = Flask(
    __name__,
    template_folder=str("templates"),
    static_folder=str("static"),
)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/privacidade")
def privacidade():
    return render_template("privacidade.html")

@app.route("/termos")
def termos():
    return render_template("termos.html")

if __name__ == "__main__":
    app.run(debug=True)