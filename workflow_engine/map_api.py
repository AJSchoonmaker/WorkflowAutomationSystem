from flask import Flask, request, jsonify
from flask_cors import CORS
from engine.grid_engine import get_grid_cell

app = Flask(__name__)
CORS(app)


@app.route("/get-grid", methods=["POST"])
def get_grid():

    data = request.json

    lat = data["latitude"]
    lon = data["longitude"]

    # Temporary borough assignment
    borough = "Manhattan"

    grid = get_grid_cell(borough, lat, lon)

    return jsonify({
        "grid": grid
    })


if __name__ == "__main__":
    app.run(port=5000)