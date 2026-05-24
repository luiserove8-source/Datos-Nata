import sqlite3
import os
from datetime import datetime
from functools import wraps
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, flash, g
)
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "clave-secreta-actas-2024")

DATABASE = os.path.join(os.path.dirname(__file__), "actas.db")


# ─── Database ────────────────────────────────────────────────────────────────

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA foreign_keys=ON")
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            rol TEXT NOT NULL DEFAULT 'usuario',
            activo INTEGER NOT NULL DEFAULT 1,
            creado_en TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS actas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero INTEGER NOT NULL UNIQUE,
            descripcion TEXT NOT NULL,
            fecha TEXT NOT NULL,
            usuario_id INTEGER NOT NULL,
            creado_en TEXT NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );

        CREATE TABLE IF NOT EXISTS actividad (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            accion TEXT NOT NULL,
            detalle TEXT,
            ip TEXT,
            creado_en TEXT NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );
    """)
    # Create default admin if none exists
    existing = db.execute("SELECT id FROM usuarios WHERE rol='admin'").fetchone()
    if not existing:
        db.execute(
            "INSERT INTO usuarios (nombre, username, password_hash, rol, activo, creado_en) VALUES (?,?,?,?,?,?)",
            ("Administrador", "admin", generate_password_hash("admin123"), "admin", 1, now()),
        )
    db.commit()
    db.close()


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def registrar_actividad(usuario_id, accion, detalle=None):
    db = get_db()
    db.execute(
        "INSERT INTO actividad (usuario_id, accion, detalle, ip, creado_en) VALUES (?,?,?,?,?)",
        (usuario_id, accion, detalle, request.remote_addr, now()),
    )
    db.commit()


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "usuario_id" not in session:
            flash("Debe iniciar sesión.", "warning")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "usuario_id" not in session:
            flash("Debe iniciar sesión.", "warning")
            return redirect(url_for("login"))
        if session.get("rol") != "admin":
            flash("Acceso restringido a administradores.", "danger")
            return redirect(url_for("dashboard"))
        return f(*args, **kwargs)
    return decorated


def ultimo_numero_acta():
    db = get_db()
    row = db.execute("SELECT numero, fecha FROM actas ORDER BY numero DESC LIMIT 1").fetchone()
    return row


# ─── Auth ────────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET", "POST"])
def login():
    if "usuario_id" in session:
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        db = get_db()
        user = db.execute(
            "SELECT * FROM usuarios WHERE username=? AND activo=1", (username,)
        ).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session["usuario_id"] = user["id"]
            session["nombre"] = user["nombre"]
            session["username"] = user["username"]
            session["rol"] = user["rol"]
            registrar_actividad(user["id"], "LOGIN", f"Inicio de sesión exitoso")
            return redirect(url_for("dashboard"))
        flash("Usuario o contraseña incorrectos.", "danger")
    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    registrar_actividad(session["usuario_id"], "LOGOUT", "Cierre de sesión")
    session.clear()
    flash("Sesión cerrada.", "info")
    return redirect(url_for("login"))


# ─── Dashboard ───────────────────────────────────────────────────────────────

@app.route("/dashboard")
@login_required
def dashboard():
    db = get_db()
    total_actas = db.execute("SELECT COUNT(*) FROM actas").fetchone()[0]
    ultimo = ultimo_numero_acta()
    actas_recientes = db.execute(
        """SELECT a.numero, a.descripcion, a.fecha, a.creado_en, u.nombre as usuario
           FROM actas a JOIN usuarios u ON a.usuario_id = u.id
           ORDER BY a.numero DESC LIMIT 5"""
    ).fetchall()
    return render_template(
        "dashboard.html",
        total_actas=total_actas,
        ultimo=ultimo,
        actas_recientes=actas_recientes,
    )


# ─── Actas ───────────────────────────────────────────────────────────────────

@app.route("/actas")
@login_required
def lista_actas():
    db = get_db()
    actas = db.execute(
        """SELECT a.numero, a.descripcion, a.fecha, a.creado_en, u.nombre as usuario
           FROM actas a JOIN usuarios u ON a.usuario_id = u.id
           ORDER BY a.numero DESC"""
    ).fetchall()
    return render_template("actas.html", actas=actas)


@app.route("/actas/nueva", methods=["GET", "POST"])
@login_required
def nueva_acta():
    db = get_db()
    ultimo = ultimo_numero_acta()
    proximo_numero = (ultimo["numero"] + 1) if ultimo else 1
    alarma = None

    if request.method == "POST":
        descripcion = request.form.get("descripcion", "").strip()
        fecha_str = request.form.get("fecha", "").strip()

        if not descripcion or not fecha_str:
            flash("Descripción y fecha son obligatorias.", "danger")
            return render_template("nueva_acta.html", proximo_numero=proximo_numero, ultimo=ultimo, alarma=alarma)

        try:
            fecha_nueva = datetime.strptime(fecha_str, "%Y-%m-%d")
        except ValueError:
            flash("Formato de fecha inválido.", "danger")
            return render_template("nueva_acta.html", proximo_numero=proximo_numero, ultimo=ultimo, alarma=alarma)

        # Check alarm condition
        if ultimo:
            fecha_ultimo = datetime.strptime(ultimo["fecha"], "%Y-%m-%d")
            if fecha_nueva < fecha_ultimo:
                alarma = (
                    f"ADVERTENCIA: La fecha seleccionada ({fecha_str}) es anterior a la fecha "
                    f"del último número consecutivo #{ultimo['numero']} ({ultimo['fecha']}). "
                    f"El acta será registrada de todas formas."
                )

        try:
            db.execute(
                "INSERT INTO actas (numero, descripcion, fecha, usuario_id, creado_en) VALUES (?,?,?,?,?)",
                (proximo_numero, descripcion, fecha_str, session["usuario_id"], now()),
            )
            db.commit()
            detalle = f"Acta #{proximo_numero} | Fecha: {fecha_str} | Desc: {descripcion[:60]}"
            if alarma:
                detalle += " | [ALARMA FECHA]"
            registrar_actividad(session["usuario_id"], "CREAR_ACTA", detalle)
            flash(
                f"Acta #{proximo_numero} registrada exitosamente." + (f" | {alarma}" if alarma else ""),
                "warning" if alarma else "success",
            )
            return redirect(url_for("lista_actas"))
        except sqlite3.IntegrityError:
            flash("Error: el número consecutivo ya existe. Intente nuevamente.", "danger")

    return render_template("nueva_acta.html", proximo_numero=proximo_numero, ultimo=ultimo, alarma=alarma)


# ─── Usuarios (admin) ─────────────────────────────────────────────────────────

@app.route("/usuarios")
@admin_required
def lista_usuarios():
    db = get_db()
    usuarios = db.execute("SELECT id, nombre, username, rol, activo, creado_en FROM usuarios ORDER BY id").fetchall()
    return render_template("usuarios.html", usuarios=usuarios)


@app.route("/usuarios/nuevo", methods=["GET", "POST"])
@admin_required
def nuevo_usuario():
    if request.method == "POST":
        nombre = request.form.get("nombre", "").strip()
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        rol = request.form.get("rol", "usuario")

        if not nombre or not username or not password:
            flash("Todos los campos son obligatorios.", "danger")
            return render_template("nuevo_usuario.html")

        if rol not in ("admin", "usuario"):
            rol = "usuario"

        db = get_db()
        try:
            db.execute(
                "INSERT INTO usuarios (nombre, username, password_hash, rol, activo, creado_en) VALUES (?,?,?,?,?,?)",
                (nombre, username, generate_password_hash(password), rol, 1, now()),
            )
            db.commit()
            registrar_actividad(session["usuario_id"], "CREAR_USUARIO", f"Usuario creado: {username} ({rol})")
            flash(f"Usuario '{username}' creado exitosamente.", "success")
            return redirect(url_for("lista_usuarios"))
        except sqlite3.IntegrityError:
            flash("El nombre de usuario ya existe.", "danger")

    return render_template("nuevo_usuario.html")


@app.route("/usuarios/<int:uid>/toggle")
@admin_required
def toggle_usuario(uid):
    if uid == session["usuario_id"]:
        flash("No puede desactivar su propia cuenta.", "warning")
        return redirect(url_for("lista_usuarios"))
    db = get_db()
    user = db.execute("SELECT username, activo FROM usuarios WHERE id=?", (uid,)).fetchone()
    if not user:
        flash("Usuario no encontrado.", "danger")
        return redirect(url_for("lista_usuarios"))
    nuevo_estado = 0 if user["activo"] else 1
    db.execute("UPDATE usuarios SET activo=? WHERE id=?", (nuevo_estado, uid))
    db.commit()
    accion = "ACTIVAR_USUARIO" if nuevo_estado else "DESACTIVAR_USUARIO"
    registrar_actividad(session["usuario_id"], accion, f"Usuario: {user['username']}")
    flash(f"Usuario '{user['username']}' {'activado' if nuevo_estado else 'desactivado'}.", "info")
    return redirect(url_for("lista_usuarios"))


@app.route("/usuarios/<int:uid>/cambiar-clave", methods=["GET", "POST"])
@admin_required
def cambiar_clave(uid):
    db = get_db()
    user = db.execute("SELECT id, nombre, username FROM usuarios WHERE id=?", (uid,)).fetchone()
    if not user:
        flash("Usuario no encontrado.", "danger")
        return redirect(url_for("lista_usuarios"))
    if request.method == "POST":
        nueva = request.form.get("password", "")
        if len(nueva) < 4:
            flash("La contraseña debe tener al menos 4 caracteres.", "danger")
            return render_template("cambiar_clave.html", user=user)
        db.execute("UPDATE usuarios SET password_hash=? WHERE id=?", (generate_password_hash(nueva), uid))
        db.commit()
        registrar_actividad(session["usuario_id"], "CAMBIAR_CLAVE", f"Clave cambiada para: {user['username']}")
        flash(f"Contraseña de '{user['username']}' actualizada.", "success")
        return redirect(url_for("lista_usuarios"))
    return render_template("cambiar_clave.html", user=user)


# ─── Actividad ───────────────────────────────────────────────────────────────

@app.route("/actividad")
@admin_required
def actividad():
    db = get_db()
    filtro_usuario = request.args.get("usuario_id", "")
    usuarios = db.execute("SELECT id, nombre, username FROM usuarios ORDER BY nombre").fetchall()
    query = """SELECT ac.accion, ac.detalle, ac.ip, ac.creado_en, u.nombre, u.username
               FROM actividad ac JOIN usuarios u ON ac.usuario_id = u.id"""
    params = []
    if filtro_usuario:
        query += " WHERE ac.usuario_id=?"
        params.append(filtro_usuario)
    query += " ORDER BY ac.id DESC LIMIT 200"
    registros = db.execute(query, params).fetchall()
    return render_template("actividad.html", registros=registros, usuarios=usuarios, filtro_usuario=filtro_usuario)


# ─── Mi actividad ────────────────────────────────────────────────────────────

@app.route("/mi-actividad")
@login_required
def mi_actividad():
    db = get_db()
    registros = db.execute(
        "SELECT accion, detalle, ip, creado_en FROM actividad WHERE usuario_id=? ORDER BY id DESC LIMIT 100",
        (session["usuario_id"],),
    ).fetchall()
    return render_template("mi_actividad.html", registros=registros)


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
