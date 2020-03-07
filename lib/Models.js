const { Model, DataTypes } = require('sequelize')

class Standard extends Model {}
class Competency extends Model {}

module.exports = function (sequelize) {
    Standard.init({
        title: DataTypes.STRING
    }, {
        sequelize: sequelize,
        modelName: 'standard'
    })

    Competency.init({
        tag: DataTypes.STRING,
        desc: DataTypes.STRING
    }, {
        sequelize: sequelize,
        modelName: 'competency'
    })

    Standard.hasMany(Competency)
    Competency.belongsTo(Standard)

    return {Standard, Competency}
}